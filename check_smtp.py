import asyncio
import os
from email.message import EmailMessage
from pathlib import Path

import aiosmtplib
from dotenv import load_dotenv


ROOT_ENV = Path(__file__).resolve().parent / ".env"
BACKEND_ENV = Path(__file__).resolve().parent / "backend" / ".env"
load_dotenv(dotenv_path=ROOT_ENV if ROOT_ENV.exists() else BACKEND_ENV)


async def test_smtp():
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    recipient = os.getenv("SMTP_TEST_RECIPIENT", "")

    if not smtp_host or not smtp_user or not smtp_password or not recipient:
        raise RuntimeError(
            "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_TEST_RECIPIENT must be set"
        )

    message = EmailMessage()
    message["From"] = smtp_user
    message["To"] = recipient
    message["Subject"] = "Direct SMTP Test"
    message.set_content("Testing SMTP connection directly from script.")

    print(f"Connecting to {smtp_host}:{smtp_port} as {smtp_user}...")
    try:
        await aiosmtplib.send(
            message,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_password,
            use_tls=(smtp_port == 465),
            start_tls=(smtp_port == 587),
        )
        print("Success: Email sent.")
    except Exception as exc:
        print("Failure: Could not send email.")
        print(f"Error type: {type(exc).__name__}")
        raise


if __name__ == "__main__":
    asyncio.run(test_smtp())
