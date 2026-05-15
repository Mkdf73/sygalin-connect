from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import io
import csv
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.sms_pack import SmsPack
from app.models.sender_id import SenderID, SenderStatus
from app.models.campaign import Campaign
from app.models.notification import Transaction, TransactionType, Notification, NotificationType
from app.models.plan import Plan
from app.schemas.user import UserResponse, ClientValidation, ClientRejection, AllocateSmsRequest, AdminCreate
from app.schemas.sms_pack import SmsPackCreate, SmsPackUpdate, SmsPackResponse
from app.schemas.sender_id import SenderApproval, SenderRejection
from app.schemas.plan import PlanCreate, PlanResponse
from app.utils.dependencies import require_sygalin
from app.utils.security import get_password_hash

router = APIRouter(prefix="/admin", tags=["Administration Sygalin"])


# --- Gestion des Clients ---
@router.get("/clients", response_model=list[UserResponse])
def list_clients(
    status_filter: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_sygalin),
):
    query = db.query(User).filter(User.role == UserRole.CLIENT)
    if status_filter:
        query = query.filter(User.status == status_filter)
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%"))
            | (User.first_name.ilike(f"%{search}%"))
            | (User.last_name.ilike(f"%{search}%"))
            | (User.company.ilike(f"%{search}%"))
        )
    return query.order_by(User.created_at.desc()).all()


@router.get("/clients/{client_id}", response_model=UserResponse)
def get_client(client_id: str, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    client = db.query(User).filter(User.id == client_id, User.role == UserRole.CLIENT).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    return client


@router.patch("/clients/{client_id}/validate")
def validate_client(client_id: str, data: ClientValidation, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    client.status = UserStatus.ACTIVE
    db.add(Notification(user_id=client.id, title="Compte validÃ©", message="Votre compte a Ã©tÃ© approuvÃ© par Sygalin. Vous pouvez maintenant acheter des crÃ©dits SMS.", notification_type=NotificationType.SUCCESS))
    db.commit()
    return {"message": "Client validÃ© avec succÃ¨s"}


@router.patch("/clients/{client_id}/reject")
def reject_client(client_id: str, data: ClientRejection, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    client.status = UserStatus.REJECTED
    client.rejection_reason = data.reason
    db.add(Notification(user_id=client.id, title="Inscription rejetÃ©e", message=f"Votre inscription a Ã©tÃ© rejetÃ©e. Motif : {data.reason}", notification_type=NotificationType.ERROR))
    db.commit()
    return {"message": "Client rejetÃ©"}


@router.patch("/clients/{client_id}/suspend")
def suspend_client(client_id: str, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    client.status = UserStatus.SUSPENDED
    client.is_active = False
    db.commit()
    return {"message": "Client suspendu"}


@router.patch("/clients/{client_id}/reactivate")
def reactivate_client(client_id: str, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    client.status = UserStatus.ACTIVE
    client.is_active = True
    db.commit()
    return {"message": "Client rÃ©activÃ©"}


# --- Gestion des Packs SMS ---
@router.get("/packs", response_model=list[SmsPackResponse])
def list_packs(db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    return db.query(SmsPack).order_by(SmsPack.created_at.desc()).all()


@router.post("/packs", response_model=SmsPackResponse, status_code=201)
def create_pack(data: SmsPackCreate, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    pack = SmsPack(**data.model_dump())
    db.add(pack)
    db.commit()
    db.refresh(pack)
    return pack


# --- Gestion des Plans SaaS ---
@router.get("/plans", response_model=list[PlanResponse])
def list_plans(db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    return db.query(Plan).filter(Plan.is_active == True).order_by(Plan.created_at.desc()).all()


@router.post("/plans", response_model=PlanResponse, status_code=201)
def create_plan(data: PlanCreate, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    plan = Plan(**data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.patch("/packs/{pack_id}", response_model=SmsPackResponse)
def update_pack(pack_id: str, data: SmsPackUpdate, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    pack = db.query(SmsPack).filter(SmsPack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack introuvable")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pack, key, value)
    db.commit()
    db.refresh(pack)
    return pack


@router.delete("/packs/{pack_id}")
def delete_pack(pack_id: str, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    pack = db.query(SmsPack).filter(SmsPack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack introuvable")
    db.delete(pack)
    db.commit()
    return {"message": "Pack supprimÃ©"}


# --- Allocation manuelle de SMS ---
@router.post("/allocate-sms")
def allocate_sms(data: AllocateSmsRequest, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    client = db.query(User).filter(User.id == data.user_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable")
    client.sms_balance += data.sms_count
    tx = Transaction(
        user_id=client.id,
        transaction_type=TransactionType.ALLOCATION,
        sms_count=data.sms_count,
        reference=data.reference,
        description=f"Attribution de {data.sms_count} SMS par Sygalin",
    )
    db.add(tx)
    db.add(Notification(user_id=client.id, title="CrÃ©dits SMS reÃ§us", message=f"Vous avez reÃ§u {data.sms_count} crÃ©dits SMS.", notification_type=NotificationType.SUCCESS))
    db.commit()
    return {"message": f"{data.sms_count} SMS attribuÃ©s Ã  {client.email}", "new_balance": client.sms_balance}


# --- Gestion des Sender IDs ---
@router.get("/senders")
def list_all_senders(status_filter: str | None = None, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    query = db.query(SenderID)
    if status_filter:
        query = query.filter(SenderID.status == status_filter)
    senders = query.order_by(SenderID.created_at.desc()).all()
    results = []
    for s in senders:
        user = db.query(User).filter(User.id == s.user_id).first()
        results.append({
            "id": s.id, "name": s.name, "usage_type": s.usage_type.value if s.usage_type else "",
            "description": s.description, "status": s.status.value if s.status else "",
            "rejection_reason": s.rejection_reason, "user_id": s.user_id,
            "user_email": user.email if user else "", "user_company": user.company if user else "",
            "created_at": s.created_at.isoformat() if s.created_at else "",
        })
    return results


@router.patch("/senders/{sender_id}/approve")
def approve_sender(sender_id: str, data: SenderApproval, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    sender = db.query(SenderID).filter(SenderID.id == sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender ID introuvable")
    sender.status = SenderStatus.APPROVED
    db.add(Notification(user_id=sender.user_id, title="Sender ID approuvÃ©", message=f'Votre Sender ID "{sender.name}" a Ã©tÃ© approuvÃ©.', notification_type=NotificationType.SUCCESS))
    db.commit()
    return {"message": f'Sender ID "{sender.name}" approuvÃ©'}


@router.patch("/senders/{sender_id}/reject")
def reject_sender(sender_id: str, data: SenderRejection, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    sender = db.query(SenderID).filter(SenderID.id == sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender ID introuvable")
    sender.status = SenderStatus.REJECTED
    sender.rejection_reason = data.reason
    db.add(Notification(user_id=sender.user_id, title="Sender ID rejetÃ©", message=f'Votre Sender ID "{sender.name}" a Ã©tÃ© rejetÃ©. Motif : {data.reason}', notification_type=NotificationType.ERROR))
    db.commit()
    return {"message": f'Sender ID "{sender.name}" rejetÃ©'}


# --- Rapports ---
@router.get("/reports")
def global_reports(db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    total_clients = db.query(User).filter(User.role == UserRole.CLIENT).count()
    active_clients = db.query(User).filter(User.role == UserRole.CLIENT, User.status == UserStatus.ACTIVE).count()
    pending_clients = db.query(User).filter(User.role == UserRole.CLIENT, User.status == UserStatus.PENDING).count()
    total_campaigns = db.query(Campaign).count()
    total_sms_sent = db.query(func.sum(Campaign.sent_count)).scalar() or 0
    total_sms_delivered = db.query(func.sum(Campaign.delivered_count)).scalar() or 0
    total_sms_failed = db.query(func.sum(Campaign.failed_count)).scalar() or 0
    total_revenue = db.query(func.sum(Transaction.amount)).filter(Transaction.transaction_type == TransactionType.PURCHASE).scalar() or 0
    pending_senders = db.query(SenderID).filter(SenderID.status == SenderStatus.PENDING).count()

    # Statistiques sur les 7 derniers jours
    today = date.today()
    daily_stats = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%d/%m")
        # Somme des SMS envoyÃ©s ce jour-lÃ 
        count = db.query(func.sum(Campaign.sent_count)).filter(
            func.date(Campaign.created_at) == day
        ).scalar() or 0
        daily_stats.append({"name": day_str, "value": count})

    return {
        "total_clients": total_clients,
        "active_clients": active_clients,
        "pending_clients": pending_clients,
        "total_campaigns": total_campaigns,
        "total_sms_sent": total_sms_sent,
        "total_sms_delivered": total_sms_delivered,
        "total_sms_failed": total_sms_failed,
        "delivery_rate": round((total_sms_delivered / total_sms_sent * 100) if total_sms_sent > 0 else 0, 1),
        "total_revenue": total_revenue,
        "pending_senders": pending_senders,
        "daily_stats": daily_stats,
    }


@router.get("/transactions")
def list_transactions(db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    txs = db.query(Transaction).order_by(Transaction.created_at.desc()).limit(100).all()
    results = []
    for tx in txs:
        user = db.query(User).filter(User.id == tx.user_id).first()
        results.append({
            "id": tx.id, "user_id": tx.user_id, "user_email": user.email if user else "",
            "transaction_type": tx.transaction_type.value if tx.transaction_type else "",
            "sms_count": tx.sms_count, "amount": tx.amount, "currency": tx.currency,
            "reference": tx.reference, "description": tx.description,
            "created_at": tx.created_at.isoformat() if tx.created_at else "",
        })
    return results


@router.get("/transactions/csv")
def export_transactions_csv(db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    # On rÃ©cupÃ¨re toutes les transactions (limitÃ©es Ã  1000 pour l'export complet par dÃ©faut)
    txs = db.query(Transaction).order_by(Transaction.created_at.desc()).limit(1000).all()
    
    # CrÃ©ation du buffer mÃ©moire
    output = io.StringIO()
    # Ajout du BOM UTF-8 pour Excel (indispensable pour les accents)
    output.write('\ufeff')
    
    writer = csv.writer(output, delimiter=';')
    # En-tÃªtes
    writer.writerow(["Date", "Utilisateur", "Type", "SMS", "Montant", "Devise", "RÃ©fÃ©rence", "Description"])
    
    for tx in txs:
        user = db.query(User).filter(User.id == tx.user_id).first()
        transaction_date = tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else "-"
        
        tx_type_map = {
            TransactionType.PURCHASE: "Achat Pack",
            TransactionType.ALLOCATION: "Allocation Admin",
            TransactionType.CAMPAIGN_DEBIT: "DÃ©bit Campagne",
            TransactionType.REFUND: "Remboursement"
        }
        tx_type = tx_type_map.get(tx.transaction_type, tx.transaction_type.value)
        
        writer.writerow([
            transaction_date,
            user.email if user else "Inconnu",
            tx_type,
            tx.sms_count,
            tx.amount,
            tx.currency,
            tx.reference or "-",
            tx.description or "-"
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rapport_transactions_{date.today()}.csv"}
    )


# --- Gestion des Administrateurs ---
@router.get("/administrators", response_model=list[UserResponse])
def list_administrators(db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    return db.query(User).filter(User.role == UserRole.SYGALIN).order_by(User.created_at.desc()).all()


@router.post("/administrators", response_model=UserResponse, status_code=201)
def create_administrator(data: AdminCreate, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est dÃ©jÃ  utilisÃ©.")
        
    new_admin = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role=UserRole.SYGALIN,
        status=UserStatus.ACTIVE,
        is_active=True,
    )
    db.add(new_admin)
    
    # Notification pour l'admin crÃ©ateur
    db.add(Notification(
        user_id=admin.id,
        title="Nouvel Administrateur",
        message=f"L'administrateur {data.email} ({data.first_name}) a Ã©tÃ© crÃ©Ã© avec succÃ¨s.",
        notification_type=NotificationType.SUCCESS
    ))
    
    db.commit()
    db.refresh(new_admin)
    return new_admin


@router.delete("/administrators/{admin_id}")
def delete_administrator(admin_id: str, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    if admin.id == admin_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas supprimer votre propre compte.")
        
    target_admin = db.query(User).filter(User.id == admin_id, User.role == UserRole.SYGALIN).first()
    if not target_admin:
        raise HTTPException(status_code=404, detail="Administrateur introuvable.")
        
    db.delete(target_admin)
    
    # Notification pour l'admin suppresseur
    db.add(Notification(
        user_id=admin.id,
        title="Administrateur supprimÃ©",
        message=f"Le compte administrateur de {target_admin.email} a Ã©tÃ© dÃ©finitivement supprimÃ©.",
        notification_type=NotificationType.WARNING
    ))
    
    db.commit()
    return {"message": "Administrateur supprimÃ©."}


# --- Notifications Admin ---
@router.get("/notifications")
def list_admin_notifications(db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    # On rÃ©cupÃ¨re soit les notifs directes pour l'admin, soit les notifs systÃ¨me
    notifs = db.query(Notification).filter(Notification.user_id == admin.id).order_by(Notification.created_at.desc()).limit(50).all()
    return [{
        "id": n.id, "title": n.title, "message": n.message,
        "notification_type": n.notification_type.value, "is_read": n.is_read,
        "created_at": n.created_at.isoformat() if n.created_at else "",
    } for n in notifs]


@router.patch("/notifications/{notif_id}/read")
def mark_admin_notification_read(notif_id: str, db: Session = Depends(get_db), admin: User = Depends(require_sygalin)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == admin.id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "OK"}
