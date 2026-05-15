import random
import math
import asyncio
from datetime import datetime, timezone, timedelta, date
import io
import csv
import openpyxl
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.database import get_db
from app.models.user import User
from app.models.sms_pack import SmsPack
from app.models.sender_id import SenderID, SenderStatus
from app.models.contact import Contact, Group, contact_group
from app.models.campaign import Campaign, Message, CampaignStatus, MessageStatus
from app.models.notification import Transaction, TransactionType, Notification, NotificationType
from app.schemas.sms_pack import SmsPackResponse, PurchaseRequest
from app.schemas.sender_id import SenderIDCreate, SenderIDResponse
from app.schemas.contact import ContactCreate, ContactResponse, GroupCreate, GroupResponse, GroupUpdate
from app.schemas.campaign import CampaignCreate, CampaignResponse, MessageResponse
from app.services.sms_gateway import sms_gateway
from app.utils.dependencies import get_current_user, require_active_client
from app.utils.phone import normalize_phone

router = APIRouter(prefix="/client", tags=["Espace Client"])


# --- Profil ---
@router.get("/me")
def get_profile(user: User = Depends(get_current_user)):
    return {
        "id": user.id, "email": user.email, "first_name": user.first_name,
        "last_name": user.last_name, "company": user.company, "phone": user.phone,
        "country": user.country, "role": user.role.value, "status": user.status.value,
        "sms_balance": user.sms_balance, "created_at": user.created_at.isoformat() if user.created_at else "",
    }


# --- Balance ---
@router.get("/balance")
def get_balance(user: User = Depends(get_current_user)):
    return {"sms_balance": user.sms_balance, "email": user.email}


# --- Packs disponibles ---
@router.get("/packs", response_model=list[SmsPackResponse])
def list_available_packs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(SmsPack).filter(SmsPack.is_active == True).order_by(SmsPack.price.asc()).all()


# --- Achat de pack ---
@router.post("/purchase")
def purchase_pack(data: PurchaseRequest, db: Session = Depends(get_db), user: User = Depends(require_active_client)):
    pack = db.query(SmsPack).filter(SmsPack.id == data.pack_id, SmsPack.is_active == True).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack introuvable ou indisponible")
    
    user.sms_balance += pack.sms_count
    
    # Formatage de la description avec la mÃ©thode de paiement
    method_name_map = {
        "orange_money": "Orange Money",
        "mtn_momo": "MTN Mobile Money",
        "card": "Carte Bancaire"
    }
    method_display = method_name_map.get(data.payment_method, data.payment_method) if data.payment_method else "Standard"
    
    desc_str = f"Achat du pack {pack.name} via {method_display}"
    if data.payment_details:
         desc_str += f" ({data.payment_details})"

    tx = Transaction(
        user_id=user.id, transaction_type=TransactionType.PURCHASE,
        sms_count=pack.sms_count, amount=pack.price, currency=pack.currency,
        pack_id=pack.id, description=desc_str,
    )
    db.add(tx)
    db.add(Notification(
        user_id=user.id, 
        title="Paiement confirmÃ©", 
        message=f"Votre paiement via {method_display} pour le pack {pack.name} ({pack.sms_count} SMS) a bien Ã©tÃ© validÃ©.", 
        notification_type=NotificationType.SUCCESS
    ))
    db.commit()
    return {"message": f"Pack {pack.name} achetÃ© avec succÃ¨s via {method_display}", "new_balance": user.sms_balance}


# --- Historique des transactions ---
@router.get("/transactions")
def my_transactions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    txs = db.query(Transaction).filter(Transaction.user_id == user.id).order_by(Transaction.created_at.desc()).all()
    return [{
        "id": tx.id, "transaction_type": tx.transaction_type.value,
        "sms_count": tx.sms_count, "amount": tx.amount, "currency": tx.currency,
        "description": tx.description, "created_at": tx.created_at.isoformat() if tx.created_at else "",
    } for tx in txs]


# --- Sender IDs ---
@router.get("/senders", response_model=list[SenderIDResponse])
def list_my_senders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(SenderID).filter(SenderID.user_id == user.id).order_by(SenderID.created_at.desc()).all()


@router.post("/senders", response_model=SenderIDResponse, status_code=201)
def create_sender(data: SenderIDCreate, db: Session = Depends(get_db), user: User = Depends(require_active_client)):
    from app.models.user import UserRole
    existing = db.query(SenderID).filter(SenderID.name == data.name, SenderID.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez dÃ©jÃ  soumis ce Sender ID")
    sender = SenderID(name=data.name, usage_type=data.usage_type, description=data.description, user_id=user.id)
    db.add(sender)
    
    # Notification de soumission pour le client
    db.add(Notification(
        user_id=user.id,
        title="Sender ID soumis",
        message=f'Votre demande pour le Sender ID "{data.name}" a Ã©tÃ© soumise Ã  l\'Ã©quipe Sygalin pour validation.',
        notification_type=NotificationType.INFO
    ))
    
    # Notification pour tous les administrateurs Sygalin
    client_display = user.company or f"{user.first_name} {user.last_name}"
    admins = db.query(User).filter(User.role == UserRole.SYGALIN).all()
    for admin in admins:
        db.add(Notification(
            user_id=admin.id,
            title="Nouvelle demande de Sender ID",
            message=f'Le client "{client_display}" ({user.email}) a soumis une demande de Sender ID : "{data.name}". Veuillez la traiter dans la section Senders.',
            notification_type=NotificationType.WARNING
        ))
    
    db.commit()
    db.refresh(sender)
    return sender


# --- Contacts ---
@router.get("/contacts", response_model=list[ContactResponse])
def list_contacts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Contact).filter(Contact.user_id == user.id).order_by(Contact.created_at.desc()).all()


@router.post("/contacts", response_model=ContactResponse, status_code=201)
def create_contact(data: ContactCreate, db: Session = Depends(get_db), user: User = Depends(require_active_client)):
    print(f"[CREATE CONTACT] phone={data.phone}, name={data.name}, group_id={data.group_id}")
    
    # 1. Rechercher si le contact existe dÃ©jÃ  pour cet utilisateur
    normalized_phone = normalize_phone(data.phone)
    contact = db.query(Contact).filter(Contact.phone == normalized_phone, Contact.user_id == user.id).first()
    
    if not contact:
        contact = Contact(phone=normalized_phone, name=data.name, email=data.email, user_id=user.id)
        db.add(contact)
        db.flush()  # GÃ©nÃ©rer l'ID du contact
        print(f"[CREATE CONTACT] Nouveau contact crÃ©Ã©: id={contact.id}")
    else:
        # Mise Ã  jour si dÃ©jÃ  existant
        if data.name: contact.name = data.name
        if data.email: contact.email = data.email
        print(f"[CREATE CONTACT] Contact existant mis Ã  jour: id={contact.id}")
    
    # 2. Liaison au groupe si demandÃ©
    if data.group_id:
        group = db.query(Group).filter(Group.id == data.group_id, Group.user_id == user.id).first()
        if group:
            # VÃ©rification : est-ce que le contact est dÃ©jÃ  dans ce groupe ?
            stmt = select(contact_group).where(
                (contact_group.c.contact_id == contact.id) & 
                (contact_group.c.group_id == group.id)
            )
            exists = db.execute(stmt).first()
            
            if not exists:
                db.execute(contact_group.insert().values(
                    contact_id=contact.id, 
                    group_id=group.id
                ))
                db.flush()  # Persister l'association immÃ©diatement
                print(f"[CREATE CONTACT] AssociÃ© au groupe '{group.name}' (id={group.id})")
            else:
                print(f"[CREATE CONTACT] Contact dÃ©jÃ  dans le groupe '{group.name}'")
        else:
            print(f"[CREATE CONTACT] Groupe introuvable: {data.group_id}")
    else:
        print(f"[CREATE CONTACT] Pas de group_id fourni, contact ajoutÃ© en global uniquement")
            
    db.commit()
    db.refresh(contact)
    return contact


@router.post("/contacts/batch", status_code=201)
def create_contacts_batch(contacts: list[ContactCreate], db: Session = Depends(get_db), user: User = Depends(require_active_client)):
    created = 0
    duplicates = 0
    for c in contacts:
        normalized_phone = normalize_phone(c.phone)
        existing = db.query(Contact).filter(Contact.phone == normalized_phone, Contact.user_id == user.id).first()
        if existing:
            duplicates += 1
            continue
        db.add(Contact(phone=normalized_phone, name=c.name, email=c.email, user_id=user.id))
        created += 1
    db.commit()
    return {"created": created, "duplicates": duplicates}


@router.post("/contacts/import", status_code=201)
async def import_contacts(
    file: UploadFile = File(...), 
    group_id: str | None = Form(None), 
    db: Session = Depends(get_db), 
    user: User = Depends(require_active_client)
):
    contents = await file.read()
    contacts_to_create = []
    
    try:
        if file.filename.endswith(".csv"):
            text = contents.decode("utf-8-sig")
            reader = csv.reader(text.splitlines(), delimiter=';' if ';' in text else ',')
            for i, row in enumerate(reader):
                if i == 0 and "phone" in str(row).lower():
                    continue
                if len(row) >= 1:
                    phone = normalize_phone(row[0].strip())
                    if not phone: continue
                    name = row[1].strip() if len(row) > 1 else None
                    email = row[2].strip() if len(row) > 2 else None
                    contacts_to_create.append({"phone": phone, "name": name, "email": email})
                    
        elif file.filename.endswith(".xlsx"):
            wb = openpyxl.load_workbook(io.BytesIO(contents))
            ws = wb.active
            for i, row in enumerate(ws.iter_rows(values_only=True)):
                if i == 0 and isinstance(row[0], str) and "phone" in str(row[0]).lower():
                    continue
                if not row or not row[0]: continue
                phone = normalize_phone(str(row[0]).strip())
                name = str(row[1]).strip() if len(row) > 1 and row[1] else None
                email = str(row[2]).strip() if len(row) > 2 and row[2] else None
                contacts_to_create.append({"phone": phone, "name": name, "email": email})
        else:
            raise HTTPException(status_code=400, detail="Format non supportÃ© (.csv ou .xlsx requis)")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de lecture du fichier: {str(e)}")
        
    if not contacts_to_create:
        raise HTTPException(status_code=400, detail="Le fichier ne contient aucun contact valide.")
        
    created = 0
    duplicates = 0
    new_contacts = []
    
    for item in contacts_to_create:
        existing = db.query(Contact).filter(Contact.phone == item["phone"], Contact.user_id == user.id).first()
        if existing:
            if item["name"] and not existing.name:
                existing.name = item["name"]
            duplicates += 1
            new_contacts.append(existing)
        else:
            c = Contact(phone=item["phone"], name=item["name"], email=item["email"], user_id=user.id)
            db.add(c)
            db.flush()
            new_contacts.append(c)
            created += 1
            
    if group_id:
        group = db.query(Group).filter(Group.id == group_id, Group.user_id == user.id).first()
        if group:
            for c in new_contacts:
                stmt = select(contact_group).where(
                    (contact_group.c.contact_id == c.id) & 
                    (contact_group.c.group_id == group.id)
                )
                if not db.execute(stmt).first():
                    db.execute(contact_group.insert().values(contact_id=c.id, group_id=group.id))
            
            # Notification de succÃ¨s de l'importation
            db.add(Notification(
                user_id=user.id,
                title="Importation rÃ©ussie",
                message=f"L'importation est terminÃ©e. {created} nouveaux contacts ont Ã©tÃ© ajoutÃ©s au groupe '{group.name}'.",
                notification_type=NotificationType.SUCCESS
            ))
                    
    db.commit()
    return {"created": created, "duplicates": duplicates, "total_processed": len(contacts_to_create)}


@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    db.delete(contact)
    db.commit()
    return {"message": "Contact supprimÃ©"}


# --- Groupes ---
@router.get("/groups")
def list_groups(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    groups = db.query(Group).filter(Group.user_id == user.id).order_by(Group.created_at.desc()).all()
    result = []
    for g in groups:
        count = db.query(contact_group).filter(contact_group.c.group_id == g.id).count()
        result.append({"id": g.id, "name": g.name, "description": g.description, "contact_count": count, "created_at": g.created_at.isoformat() if g.created_at else ""})
    return result


@router.post("/groups", status_code=201)
def create_group(data: GroupCreate, db: Session = Depends(get_db), user: User = Depends(require_active_client)):
    group = Group(name=data.name, description=data.description, user_id=user.id)
    db.add(group)
    db.flush()
    for cid in data.contact_ids:
        contact = db.query(Contact).filter(Contact.id == cid, Contact.user_id == user.id).first()
        if contact:
            db.execute(contact_group.insert().values(contact_id=cid, group_id=group.id))
    db.commit()
    db.refresh(group)
    count = db.query(contact_group).filter(contact_group.c.group_id == group.id).count()
    return {"id": group.id, "name": group.name, "description": group.description, "contact_count": count}


@router.get("/groups/{group_id}/contacts")
def get_group_contacts(group_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = db.query(Group).filter(Group.id == group_id, Group.user_id == user.id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Groupe introuvable")
    contact_ids = [r.contact_id for r in db.query(contact_group).filter(contact_group.c.group_id == group_id).all()]
    contacts = db.query(Contact).filter(Contact.id.in_(contact_ids)).all()
    return [{"id": c.id, "phone": c.phone, "name": c.name, "email": c.email} for c in contacts]


@router.delete("/groups/{group_id}")
def delete_group(group_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    group = db.query(Group).filter(Group.id == group_id, Group.user_id == user.id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Groupe introuvable")
    db.execute(contact_group.delete().where(contact_group.c.group_id == group_id))
    db.delete(group)
    db.commit()
    return {"message": "Groupe supprimÃ©"}


# --- Campagnes SMS ---
def simulate_sms_sending_sync(campaign_id: str, db_url: str):
    """Exécute l'envoi SMS via la passerelle dans un thread bloquant."""
    import asyncio
    asyncio.run(process_campaign_async(campaign_id, db_url))


async def simulate_sms_sending(campaign_id: str, db_url: str):
    """Exécute l'envoi SMS via la passerelle en tant que tâche FastAPI."""
    await process_campaign_async(campaign_id, db_url)


async def process_campaign_async(campaign_id: str, db_url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session as DBSession

    connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}
    engine = create_engine(db_url, connect_args=connect_args)
    session = DBSession(bind=engine)
    campaign = None
    try:
        campaign = session.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            return

        campaign.status = CampaignStatus.SENDING
        session.commit()

        messages = session.query(Message).filter(Message.campaign_id == campaign_id).all()
        if not messages:
            campaign.status = CampaignStatus.FAILED
            campaign.provider_response = "Aucun message à envoyer"
            campaign.completed_at = datetime.now(timezone.utc)
            session.commit()
            return

        result = await sms_gateway.send_bulk(
            recipients=[msg.contact_phone for msg in messages],
            message=campaign.message_content,
            sender_id=campaign.sender_id,
            encoding=campaign.encoding,
        )

        mapped = {
            item.get("to"): item
            for item in result.messages
            if isinstance(item, dict) and item.get("to")
        }

        sent = delivered = failed = 0
        for msg in messages:
            response = mapped.get(msg.contact_phone, {})
            status = str(response.get("status", "")).lower()

            if status == "delivered":
                msg.status = MessageStatus.DELIVERED
                msg.sent_at = datetime.now(timezone.utc)
                msg.delivered_at = datetime.now(timezone.utc)
                delivered += 1
            elif status in ("sent", "sandbox"):
                msg.status = MessageStatus.SENT
                msg.sent_at = datetime.now(timezone.utc)
                sent += 1
            else:
                msg.status = MessageStatus.FAILED
                msg.error_message = response.get("error") or response.get("message") or "Échec d'envoi SMS"
                failed += 1

            msg.external_id = response.get("message_id") or response.get("id")
            msg.provider_response = str(response)

        campaign.sent_count = sent + delivered
        campaign.delivered_count = delivered
        campaign.failed_count = failed
        campaign.provider_name = result.provider
        campaign.provider_response = str(result.provider_response or result.to_dict())
        campaign.status = CampaignStatus.COMPLETED if result.success and failed == 0 else CampaignStatus.FAILED
        campaign.completed_at = datetime.now(timezone.utc)
        session.commit()
    except Exception as exc:
        if campaign is not None:
            campaign.status = CampaignStatus.FAILED
            campaign.provider_response = str(exc)
            campaign.completed_at = datetime.now(timezone.utc)
            session.commit()
    finally:
        session.close()


@router.post("/campaigns", response_model=CampaignResponse, status_code=201)
def create_campaign(
    data: CampaignCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_client),
):
    sender = db.query(SenderID).filter(SenderID.id == data.sender_id, SenderID.user_id == user.id, SenderID.status == SenderStatus.APPROVED).first()
    if not sender:
        raise HTTPException(status_code=400, detail="Sender ID invalide ou non approuvÃ©")

    # Collect contact phones
    phones = set()
    for cid in data.contact_ids:
        contact = db.query(Contact).filter(Contact.id == cid, Contact.user_id == user.id).first()
        if contact:
            phones.add((contact.phone, contact.name))
    for gid in data.group_ids:
        cids = [r.contact_id for r in db.query(contact_group).filter(contact_group.c.group_id == gid).all()]
        for c in db.query(Contact).filter(Contact.id.in_(cids)).all():
            phones.add((c.phone, c.name))

    if not phones:
        raise HTTPException(status_code=400, detail="Aucun destinataire valide")

    sms_per_msg = math.ceil(len(data.message_content) / 160) if data.encoding == "GSM" else math.ceil(len(data.message_content) / 70)
    total_sms = len(phones) * sms_per_msg

    if user.sms_balance < total_sms:
        raise HTTPException(status_code=400, detail=f"Solde insuffisant. {total_sms} SMS requis, {user.sms_balance} disponibles.")

    campaign = Campaign(
        name=data.name, message_content=data.message_content, sender_id=data.sender_id,
        user_id=user.id, encoding=data.encoding, total_recipients=len(phones),
        sms_per_message=sms_per_msg, total_sms_used=total_sms,
        is_scheduled=data.is_scheduled, scheduled_at=data.scheduled_at,
        status=CampaignStatus.SCHEDULED if data.is_scheduled else CampaignStatus.SENDING,
    )
    db.add(campaign)
    db.flush()

    for phone, name in phones:
        db.add(Message(campaign_id=campaign.id, contact_phone=phone, contact_name=name))

    user.sms_balance -= total_sms
    db.add(Transaction(
        user_id=user.id, transaction_type=TransactionType.CAMPAIGN_DEBIT,
        sms_count=total_sms, campaign_id=campaign.id,
        description=f"Campagne \"{campaign.name}\" â€” {len(phones)} destinataires",
    ))
    
    # Notification de crÃ©ation de campagne
    notif_msg = f"Votre campagne '{campaign.name}' a Ã©tÃ© crÃ©Ã©e avec {len(phones)} destinataires."
    if data.is_scheduled:
        notif_msg += f" Elle est programmÃ©e pour le {data.scheduled_at.strftime('%d/%m/%Y %H:%M')}."
    else:
        notif_msg += " L'envoi va dÃ©marrer immÃ©diatement."
        
    db.add(Notification(
        user_id=user.id,
        title="Campagne enregistrÃ©e",
        message=notif_msg,
        notification_type=NotificationType.SUCCESS
    ))
    
    db.commit()
    db.refresh(campaign)

    if not data.is_scheduled:
        from app.config import DATABASE_URL
        background_tasks.add_task(simulate_sms_sending, campaign.id, DATABASE_URL)

    return campaign


@router.get("/campaigns", response_model=list[CampaignResponse])
def list_campaigns(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Campaign).filter(Campaign.user_id == user.id).order_by(Campaign.created_at.desc()).all()


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne introuvable")
    return campaign


@router.get("/campaigns/{campaign_id}/messages", response_model=list[MessageResponse])
def get_campaign_messages(campaign_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campagne introuvable")
    return db.query(Message).filter(Message.campaign_id == campaign_id).all()


# --- Notifications ---
@router.get("/notifications")
def list_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notifs = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return [{
        "id": n.id, "title": n.title, "message": n.message,
        "notification_type": n.notification_type.value, "is_read": n.is_read,
        "created_at": n.created_at.isoformat() if n.created_at else "",
    } for n in notifs]


@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notif = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == user.id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "OK"}


# --- Rapports client ---
@router.get("/reports")
def client_reports(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    campaigns = db.query(Campaign).filter(Campaign.user_id == user.id).all()
    total_sent = sum(c.sent_count for c in campaigns)
    total_delivered = sum(c.delivered_count for c in campaigns)
    total_failed = sum(c.failed_count for c in campaigns)
    
    # Statistiques sur les 7 derniers jours
    today = date.today()
    daily_stats = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%d/%m")
        # Filtrer par utilisateur et par jour
        count = db.query(func.sum(Campaign.sent_count)).filter(
            Campaign.user_id == user.id,
            func.date(Campaign.created_at) == day
        ).scalar() or 0
        daily_stats.append({"name": day_str, "value": count})

    return {
        "total_campaigns": len(campaigns),
        "total_sms_sent": total_sent,
        "total_sms_delivered": total_delivered,
        "total_sms_failed": total_failed,
        "delivery_rate": round((total_delivered / total_sent * 100) if total_sent > 0 else 0, 1),
        "sms_balance": user.sms_balance,
        "daily_stats": daily_stats,
    }
