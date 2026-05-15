import logging
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.models.user import User
from app.services.email_service import email_service
from app.utils.dependencies import require_sygalin


router = APIRouter()
logger = logging.getLogger("sygalin.email")


class EmailRequest(BaseModel):
    email: EmailStr


@router.post("/send-test-email", status_code=status.HTTP_200_OK)
async def send_test_email(
    request: EmailRequest,
    admin: User = Depends(require_sygalin),
):
    message = EmailMessage()
    message["From"] = email_service.sender
    message["To"] = request.email
    message["Subject"] = "Test email from Sygalin Connect"
    message.set_content("Ceci est un email de test envoye depuis l'API FastAPI.")

    try:
        await email_service.send_message(message)
        logger.info("Email de test envoye par admin_id=%s vers %s", admin.id, request.email)
        return {"detail": "Email de test envoye avec succes"}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception:
        logger.exception("Echec d'envoi de l'email de test")
        raise HTTPException(status_code=503, detail="Impossible d'envoyer l'email de test")
