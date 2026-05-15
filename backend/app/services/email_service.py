import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import FRONTEND_URL, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER


logger = logging.getLogger("sygalin.email_service")


class EmailService:
    @property
    def sender(self) -> str:
        return SMTP_USER or "no-reply@sygalin.local"

    @staticmethod
    def _validate_config() -> None:
        if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
            raise RuntimeError("Configuration SMTP incomplete")
        if SMTP_USER.startswith("your_") or SMTP_PASSWORD.startswith("your_"):
            raise RuntimeError("Configuration SMTP incomplete")

    async def send_message(self, message: EmailMessage) -> None:
        self._validate_config()
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=(SMTP_PORT == 465),
            start_tls=(SMTP_PORT == 587),
        )

    async def send_password_reset_email(
        self,
        to_email: str,
        token: str,
        frontend_url: str | None = None,
    ) -> bool:
        if not frontend_url:
            frontend_url = FRONTEND_URL or "http://localhost:5173"

        reset_link = f"{frontend_url}/reset-password?token={token}"

        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = to_email
        message["Subject"] = "Reinitialisation de votre mot de passe"

        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Reinitialisation de mot de passe</h2>
                    <p>Bonjour,</p>
                    <p>Vous avez demande la reinitialisation de votre mot de passe pour votre compte <strong>Sygalin Connect</strong>.</p>
                    <p>Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable pendant <strong>15 minutes</strong>.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reinitialiser mon mot de passe</a>
                    </div>
                    <p>Si vous n'avez pas demande cette reinitialisation, vous pouvez ignorer cet email en toute securite.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8em; color: #777;">
                        Si le bouton ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :<br>
                        {reset_link}
                    </p>
                </div>
            </body>
        </html>
        """

        message.set_content(
            f"Cliquez sur le lien suivant pour reinitialiser votre mot de passe : {reset_link}"
        )
        message.add_alternative(html_content, subtype="html")

        try:
            await self.send_message(message)
            logger.info("Email de reinitialisation envoye a %s", to_email)
            return True
        except Exception:
            logger.exception("Erreur lors de l'envoi de l'email a %s", to_email)
            return False


email_service = EmailService()
