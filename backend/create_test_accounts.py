import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole, UserStatus
from app.utils.security import get_password_hash

def init_test_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Admin Sygalin
    admin = db.query(User).filter(User.email == "admin@sygalin.com").first()
    if not admin:
        admin = User(
            email="admin@sygalin.com",
            hashed_password=get_password_hash("Admin@2026"),
            first_name="Sygalin",
            last_name="Admin",
            company="Sygalin",
            role=UserRole.SYGALIN,
            status=UserStatus.ACTIVE,
            phone="+237600000000",
            country="CM",
            sms_balance=100000
        )
        db.add(admin)

    # Client de test (déjà validé)
    client = db.query(User).filter(User.email == "client@example.com").first()
    if not client:
        client = User(
            email="client@example.com",
            hashed_password=get_password_hash("Client@2026"),
            first_name="Jean",
            last_name="Testeur",
            company="Entreprise Démo",
            role=UserRole.CLIENT,
            status=UserStatus.ACTIVE,
            phone="+237699999999",
            country="CM",
            sms_balance=2500
        )
        db.add(client)

    db.commit()
    print("SUCCES ! Comptes de test créés :")
    print("  Admin  : admin@sygalin.com / Admin@2026")
    print("  Client : client@example.com / Client@2026")

if __name__ == "__main__":
    init_test_data()
