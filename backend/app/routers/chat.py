from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List
import json
from datetime import datetime

from app.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.models.chat_message import ChatMessage
from app.schemas.chat import ChatMessageResponse, ChatMessageCreate, UnreadCount
from app.schemas.user import UserResponse
from app.utils.dependencies import get_current_user
from app.utils.security import decode_token
from app.services.ws_manager import manager

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.get("/history/{other_id}", response_model=List[ChatMessageResponse])
def get_chat_history(
    other_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """RÃ©cupÃ¨re l'historique des messages entre l'utilisateur actuel et un autre utilisateur."""
    messages = db.query(ChatMessage).filter(
        or_(
            and_(ChatMessage.sender_id == current_user.id, ChatMessage.recipient_id == other_id),
            and_(ChatMessage.sender_id == other_id, ChatMessage.recipient_id == current_user.id)
        )
    ).order_by(ChatMessage.timestamp.asc()).all()
    return messages

@router.get("/unread-counts", response_model=List[UnreadCount])
def get_unread_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """RÃ©cupÃ¨re le nombre de messages non lus groupÃ©s par expÃ©diteur."""
    unread_chats = db.query(
        ChatMessage.sender_id.label("user_id"),
        func.count(ChatMessage.id).label("count")
    ).filter(
        ChatMessage.recipient_id == current_user.id,
        ChatMessage.is_read == False
    ).group_by(ChatMessage.sender_id).all()
    
    return [UnreadCount(user_id=chat.user_id, count=chat.count) for chat in unread_chats]

@router.get("/admin-user", response_model=UserResponse)
def get_admin_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """RÃ©cupÃ¨re le compte administrateur Sygalin pour les clients."""
    admin = db.query(User).filter(User.role == UserRole.SYGALIN).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Administrateur introuvable")
    return admin


@router.post("/mark-read/{sender_id}")
def mark_messages_as_read(
    sender_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marque tous les messages reÃ§us de sender_id comme lus."""
    db.query(ChatMessage).filter(
        ChatMessage.recipient_id == current_user.id,
        ChatMessage.sender_id == sender_id,
        ChatMessage.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "Messages marquÃ©s comme lus"}

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # Validation du token
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Connexion
    await manager.connect(user_id, websocket)
    
    try:
        while True:
            # Attente de messages du client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            recipient_id = message_data.get("recipient_id")
            content = message_data.get("content")
            
            if not recipient_id or not content:
                continue

            # Sauvegarde dans la base de donnÃ©es
            db = SessionLocal()
            try:
                new_message = ChatMessage(
                    sender_id=user_id,
                    recipient_id=recipient_id,
                    content=content,
                    timestamp=datetime.utcnow()
                )
                db.add(new_message)
                db.commit()
                db.refresh(new_message)
                
                # PrÃ©paration du message pour l'envoi
                response_payload = {
                    "id": new_message.id,
                    "sender_id": new_message.sender_id,
                    "recipient_id": new_message.recipient_id,
                    "content": new_message.content,
                    "is_read": new_message.is_read,
                    "timestamp": new_message.timestamp.isoformat()
                }

                # Envoi au destinataire si connectÃ©
                await manager.send_personal_message(response_payload, recipient_id)
                # Echo Ã  l'expÃ©diteur (pour confirmer l'envoi et avoir l'ID gÃ©nÃ©rÃ©)
                await manager.send_personal_message(response_payload, user_id)
                
            except Exception as e:
                print(f"Erreur lors du traitement du message WS: {e}")
                db.rollback()
            finally:
                db.close()

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        print(f"Erreur WebSocket pour l'utilisateur {user_id}: {e}")
        manager.disconnect(user_id, websocket)
@router.post("/message")
def send_message_http(
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Envoie un message via HTTP (fallback pour WebSocket)."""
    try:
        new_message = ChatMessage(
            sender_id=current_user.id,
            recipient_id=data.recipient_id,
            content=data.content,
            timestamp=datetime.utcnow()
        )
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        
        # Payload pour le push temps rÃ©el
        response_payload = {
            "id": new_message.id,
            "sender_id": new_message.sender_id,
            "recipient_id": new_message.recipient_id,
            "content": new_message.content,
            "is_read": new_message.is_read,
            "timestamp": new_message.timestamp.isoformat()
        }

        # On tente de pousser le message via WebSocket si les utilisateurs sont connectÃ©s
        import asyncio
        from app.services.ws_manager import manager
        
        async def push_message():
            # Notifier le destinataire
            await manager.send_personal_message(response_payload, data.recipient_id)
            # Pas besoin d'echo Ã  l'envoyeur car il recevra la rÃ©ponse HTTP
            
        # ExÃ©cution asynchrone du push pour ne pas bloquer la rÃ©ponse HTTP
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(push_message())
        except:
            pass

        return response_payload
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
