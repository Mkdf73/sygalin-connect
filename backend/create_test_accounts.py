import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import (
    SYGALIN_ADMIN_COMPANY,
    SYGALIN_ADMIN_EMAIL,
    SYGALIN_ADMIN_FIRST_NAME,
    SYGALIN_ADMIN_LAST_NAME,
    SYGALIN_ADMIN_PASSWORD,
    SYGALIN_ADMIN_SMS_BALANCE,
)
from app.database import Base, SessionLocal, engine
from app.models.user import User, UserRole, UserStatus
from app.utils.security import get_password_hash


def _create_admin(db):
    if not SYGALIN_ADMIN_PASSWORD or SYGALIN_ADMIN_PASSWORD == "change_this_admin_password":
        print("Admin test account skipped: SYGALIN_ADMIN_PASSWORD is not configured.")
        return

    admin = db.query(User).filter(User.email == SYGALIN_ADMIN_EMAIL).first()
    if admin:
        print(f"Admin test account already exists: {SYGALIN_ADMIN_EMAIL}")
        return

    db.add(
        User(
            email=SYGALIN_ADMIN_EMAIL,
            hashed_password=get_password_hash(SYGALIN_ADMIN_PASSWORD),
            first_name=SYGALIN_ADMIN_FIRST_NAME,
            last_name=SYGALIN_ADMIN_LAST_NAME,
            company=SYGALIN_ADMIN_COMPANY,
            role=UserRole.SYGALIN,
            status=UserStatus.ACTIVE,
            phone=os.getenv("SYGALIN_TEST_ADMIN_PHONE", "+237600000000"),
            country=os.getenv("SYGALIN_TEST_ADMIN_COUNTRY", "CM"),
            sms_balance=SYGALIN_ADMIN_SMS_BALANCE,
        )
    )
    print(f"Admin test account created: {SYGALIN_ADMIN_EMAIL}")


def _create_client(db):
    client_email = os.getenv("SYGALIN_TEST_CLIENT_EMAIL", "client@example.com")
    client_password = os.getenv("SYGALIN_TEST_CLIENT_PASSWORD", "")
    if not client_password or client_password == "change_this_client_password":
        print("Client test account skipped: SYGALIN_TEST_CLIENT_PASSWORD is not configured.")
        return

    client = db.query(User).filter(User.email == client_email).first()
    if client:
        print(f"Client test account already exists: {client_email}")
        return

    db.add(
        User(
            email=client_email,
            hashed_password=get_password_hash(client_password),
            first_name=os.getenv("SYGALIN_TEST_CLIENT_FIRST_NAME", "Jean"),
            last_name=os.getenv("SYGALIN_TEST_CLIENT_LAST_NAME", "Testeur"),
            company=os.getenv("SYGALIN_TEST_CLIENT_COMPANY", "Entreprise Demo"),
            role=UserRole.CLIENT,
            status=UserStatus.ACTIVE,
            phone=os.getenv("SYGALIN_TEST_CLIENT_PHONE", "+237699999999"),
            country=os.getenv("SYGALIN_TEST_CLIENT_COUNTRY", "CM"),
            sms_balance=int(os.getenv("SYGALIN_TEST_CLIENT_SMS_BALANCE", "2500")),
        )
    )
    print(f"Client test account created: {client_email}")


def init_test_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _create_admin(db)
        _create_client(db)
        db.commit()
        print("Test account initialization completed.")
    finally:
        db.close()


if __name__ == "__main__":
    init_test_data()
