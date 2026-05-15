from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from email.message import EmailMessage
import aiosmtplib
import logging

router = APIRouter()

class EmailRequest(BaseModel):
    email: EmailStr

from ..config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

@router.post("/send-test-email", status_code=status.HTTP_200_OK)
async def send_test_email(request: EmailRequest):
    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = request.email
    message["Subject"] = "Test email from Sygalin Connect"
    message.set_content("Ceci est un email de test envoyÃ© depuis l'API FastAPI.")
    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=True,
        )
        return {"detail": "Email sent successfully"}
    except Exception as e:
        logging.error(f"Failed to send test email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
