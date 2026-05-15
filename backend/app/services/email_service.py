import aiosmtplib
from email.message import EmailMessage
import logging
from app.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FRONTEND_URL

class EmailService:
    @staticmethod
    async def send_password_reset_email(to_email: str, token: str, frontend_url: str = None):
        """
        Envoie un email de réinitialisation de mot de passe à l'utilisateur.
        """
        # On récupère l'URL du frontend (priorité au paramètre, puis config, puis fallback)
        if not frontend_url:
            frontend_url = FRONTEND_URL or "http://localhost:5173"
        
        reset_link = f"{frontend_url}/reset-password?token={token}"
        
        message = EmailMessage()
        message["From"] = SMTP_USER
        message["To"] = to_email
        message["Subject"] = "Réinitialisation de votre mot de passe"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Réinitialisation de mot de passe</h2>
                    <p>Bonjour,</p>
                    <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte <strong>Sygalin Connect</strong>.</p>
                    <p>Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable pendant <strong>15 minutes</strong>.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Réinitialiser mon mot de passe</a>
                    </div>
                    <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8em; color: #777;">
                        Si le bouton ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :<br>
                        {reset_link}
                    </p>
                </div>
            </body>
        </html>
        """
        
        # IMPORTANT: set_content must come BEFORE add_alternative.
        # Calling set_content after add_alternative would overwrite the multipart content.
        message.set_content(f"Cliquez sur le lien suivant pour réinitialiser votre mot de passe : {reset_link}")
        message.add_alternative(html_content, subtype="html")
        
        try:
            await aiosmtplib.send(
                message,
                hostname=SMTP_HOST,
                port=SMTP_PORT,
                username=SMTP_USER,
                password=SMTP_PASSWORD,
                use_tls=(SMTP_PORT == 465),
                start_tls=(SMTP_PORT == 587),
            )
            logging.info(f"Email de réinitialisation envoyé à {to_email}")
            return True
        except Exception as e:
            logging.error(f"Erreur lors de l'envoi de l'email à {to_email}: {e}")
            return False

email_service = EmailService()
