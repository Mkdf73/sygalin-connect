import asyncio
import aiosmtplib
from email.message import EmailMessage
import traceback

async def test_smtp():
    SMTP_HOST = "mail.infomaniak.com"
    SMTP_PORT = 587  # STARTTLS
    SMTP_USER = "test_mail@sygalin.com"
    SMTP_PASSWORD = "test_mail@042026"
    
    recipient = "sygalin.test@gmail.com"
    
    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = recipient
    message["Subject"] = "Direct SMTP Test"
    message.set_content("Testing SMTP connection directly from script.")
    
    print(f"Connecting to {SMTP_HOST}:{SMTP_PORT} as {SMTP_USER}...")
    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=False,
        )
        print("✅ Success: Email sent!")
    except Exception as e:
        print("❌ Failure: Could not send email.")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_smtp())
