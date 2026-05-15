from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.schemas.user import UserUpdate, UserResponse
from app.utils.security import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token, create_reset_token
from app.utils.dependencies import get_current_user
from datetime import datetime, timezone, timedelta
from app.utils.phone import normalize_phone
from app.models.notification import Notification, NotificationType
from app.services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["Authentification"])


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


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est dÃ©jÃ  utilisÃ©")

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

    return {"message": "Inscription rÃ©ussie. Votre compte est en attente de validation par Sygalin.", "user_id": user.id}


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Votre compte a Ã©tÃ© dÃ©sactivÃ©")

    if user.status == UserStatus.PENDING:
        raise HTTPException(
            status_code=403,
            detail="Votre compte est en attente de validation par un administrateur Sygalin. Vous recevrez une notification dÃ¨s qu'il sera activÃ©."
        )

    if user.status == UserStatus.REJECTED:
        raise HTTPException(status_code=403, detail="Votre inscription a Ã©tÃ© rejetÃ©e par Sygalin.")

    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(status_code=403, detail="Votre compte a Ã©tÃ© suspendu. Contactez le support Sygalin.")

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
        raise HTTPException(status_code=401, detail="Token de rafraÃ®chissement invalide")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    new_refresh_token = create_refresh_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=user_to_dict(user),
    )


@router.patch("/me", response_model=UserResponse)
def update_profile(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
    
    # Notification de mise Ã  jour du profil
    db.add(Notification(
        user_id=current_user.id,
        title="Profil mis Ã  jour",
        message="Vos informations personnelles ont Ã©tÃ© modifiÃ©es avec succÃ¨s.",
        notification_type=NotificationType.SUCCESS
    ))
    db.commit()
    
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Pour des raisons de sécurité, on ne dit pas si l'email existe ou non
        return {"message": "Si l'adresse email existe dans notre système, un lien de réinitialisation vous sera envoyé."}

    # Déterminer l'URL du frontend dynamiquement
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    frontend_url = origin
    if not frontend_url and referer:
        # Extraire la base du referer (ex: http://192.168.1.103:5173/forgot-password -> http://192.168.1.103:5173)
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        frontend_url = f"{parsed.scheme}://{parsed.netloc}"
    
    if not frontend_url:
        frontend_url = "http://localhost:5173" # Fallback ultime
    
    # Anti-spam : Limiter à une requête toutes les 5 minutes
    now = datetime.now(timezone.utc)
    if user.last_password_reset_request:
        # S'assurer que last_password_reset_request est offset-aware
        last_request = user.last_password_reset_request
        if last_request.tzinfo is None:
            last_request = last_request.replace(tzinfo=timezone.utc)
            
        if now - last_request < timedelta(minutes=5):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Veuillez attendre 5 minutes avant de demander un nouveau lien."
            )

    token = create_reset_token(user.email)
    
    # Mettre à jour le timestamp de la requête AVANT l'envoi pour éviter les doublons
    try:
        user.last_password_reset_request = now
        db.commit()
    except Exception as e:
        print(f"DEBUG: Failed to update last_password_reset_request: {e}")
        db.rollback()

    # Envoi réel de l'email
    email_sent = await email_service.send_password_reset_email(user.email, token, frontend_url=frontend_url)
    
    if not email_sent:
        # Rollback anti-spam timer so user can try again
        try:
            user.last_password_reset_request = None
            db.commit()
        except Exception:
            db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Impossible d’envoyer l’email. Vérifiez la configuration SMTP et réessayez."
        )
    
    return {
        "message": "Si l’adresse email existe dans notre système, un lien de réinitialisation vous sera envoyé."
    }


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = decode_token(data.token)
    if payload is None or payload.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide ou expiré")

    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    
    # Usage unique : Vérifier si une requête de réinitialisation est en cours
    if not user or user.last_password_reset_request is None:
        raise HTTPException(status_code=400, detail="Ce lien a déjà été utilisé ou est invalide")

    user.hashed_password = get_password_hash(data.new_password)
    # Marquer comme utilisé
    user.last_password_reset_request = None
    db.commit()

    return {"message": "Votre mot de passe a été réinitialisé avec succès."}
