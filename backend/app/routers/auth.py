import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse, UserUpdate
from app.services.email_service import email_service
from app.utils.dependencies import get_current_user
from app.utils.phone import normalize_phone
from app.utils.rate_limit import limiter
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    get_password_hash,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["Authentification"])
logger = logging.getLogger("sygalin.auth")


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "company": user.company,
        "phone": user.phone,
        "country": user.country,
        "role": user.role.value if user.role else "client",
        "status": user.status.value if user.status else "pending",
        "sms_balance": user.sms_balance,
    }


def _ensure_user_can_authenticate(user: User) -> None:
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Votre compte a ete desactive")

    if user.status == UserStatus.PENDING:
        raise HTTPException(
            status_code=403,
            detail=(
                "Votre compte est en attente de validation par un administrateur "
                "Sygalin. Vous recevrez une notification des qu'il sera active."
            ),
        )

    if user.status == UserStatus.REJECTED:
        raise HTTPException(status_code=403, detail="Votre inscription a ete rejetee par Sygalin.")

    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=403,
            detail="Votre compte a ete suspendu. Contactez le support Sygalin.",
        )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est deja utilise")

    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        company=data.company,
        phone=normalize_phone(data.phone) if data.phone else None,
        country=data.country,
        role=UserRole.CLIENT,
        status=UserStatus.PENDING,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Inscription reussie. Votre compte est en attente de validation par Sygalin.",
        "user_id": user.id,
    }


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    _ensure_user_can_authenticate(user)

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    refresh_token = create_refresh_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_to_dict(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token de rafraichissement invalide")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    _ensure_user_can_authenticate(user)

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    new_refresh_token = create_refresh_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=user_to_dict(user),
    )


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Deconnexion effectuee"}


@router.patch("/me", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.first_name is not None:
        current_user.first_name = data.first_name
    if data.last_name is not None:
        current_user.last_name = data.last_name
    if data.company is not None:
        current_user.company = data.company
    if data.phone is not None:
        current_user.phone = normalize_phone(data.phone)
    if data.country is not None:
        current_user.country = data.country

    db.commit()

    db.add(
        Notification(
            user_id=current_user.id,
            title="Profil mis a jour",
            message="Vos informations personnelles ont ete modifiees avec succes.",
            notification_type=NotificationType.SUCCESS,
        )
    )
    db.commit()

    db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return {
            "message": (
                "Si l'adresse email existe dans notre systeme, "
                "un lien de reinitialisation vous sera envoye."
            )
        }

    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    frontend_url = origin
    if not frontend_url and referer:
        parsed = urlparse(referer)
        frontend_url = f"{parsed.scheme}://{parsed.netloc}"

    if not frontend_url:
        frontend_url = "http://localhost:5173"

    now = datetime.now(timezone.utc)
    if user.last_password_reset_request:
        last_request = user.last_password_reset_request
        if last_request.tzinfo is None:
            last_request = last_request.replace(tzinfo=timezone.utc)

        if now - last_request < timedelta(minutes=5):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Veuillez attendre 5 minutes avant de demander un nouveau lien.",
            )

    token = create_reset_token(user.email)

    try:
        user.last_password_reset_request = now
        db.commit()
    except Exception:
        logger.exception("Impossible de mettre a jour last_password_reset_request")
        db.rollback()

    email_sent = await email_service.send_password_reset_email(
        user.email,
        token,
        frontend_url=frontend_url,
    )

    if not email_sent:
        try:
            user.last_password_reset_request = None
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Impossible d'envoyer l'email. Verifiez la configuration SMTP et reessayez.",
        )

    return {
        "message": (
            "Si l'adresse email existe dans notre systeme, "
            "un lien de reinitialisation vous sera envoye."
        )
    }


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.token)
    if payload is None or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Lien de reinitialisation invalide ou expire")

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()

    if not user or user.last_password_reset_request is None:
        raise HTTPException(status_code=400, detail="Ce lien a deja ete utilise ou est invalide")

    user.hashed_password = get_password_hash(data.new_password)
    user.last_password_reset_request = None
    db.commit()

    return {"message": "Votre mot de passe a ete reinitialise avec succes."}
