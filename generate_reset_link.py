import sys
import os
from datetime import datetime, timezone

# Ajouter le chemin pour importer l'app
sys.path.append(os.getcwd() + "/backend")

# Forcer le chemin de la DB pour le script
os.environ["DATABASE_URL"] = "sqlite:///backend/sygalin_connect.db"

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import create_reset_token
from app.config import CORS_ORIGINS

def generate_link(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ Erreur : L'utilisateur avec l'email '{email}' n'existe pas.")
            return

        token = create_reset_token(user.email)
        
        # Mettre à jour last_password_reset_request pour autoriser l'usage unique
        user.last_password_reset_request = datetime.now(timezone.utc)
        db.commit()

        frontend_url = CORS_ORIGINS[0] if CORS_ORIGINS else "http://localhost:5173"
        reset_link = f"{frontend_url}/reset-password?token={token}"
        
        print("\n" + "="*50)
        print(f"Lien de réinitialisation pour : {email}")
        print("="*50)
        print(f"\n👉 {reset_link}\n")
        print("="*50)
        print("Note : Ce lien est valable 15 minutes et n'est utilisable qu'une seule fois.")
        print("="*50 + "\n")

    except Exception as e:
        print(f"❌ Erreur : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_reset_link.py <email>")
    else:
        generate_link(sys.argv[1])
