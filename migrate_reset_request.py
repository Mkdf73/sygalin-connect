import sqlite3
import os

db_path = "backend/sygalin_connect.db"

def migrate():
    if not os.path.exists(db_path):
        print(f"Base de données non trouvée à {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Vérifier si la colonne existe déjà
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "last_password_reset_request" not in columns:
            print("Ajout de la colonne 'last_password_reset_request' à la table 'users'...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_password_reset_request DATETIME")
            conn.commit()
            print("Migration réussie !")
        else:
            print("La colonne 'last_password_reset_request' existe déjà.")
            
    except Exception as e:
        print(f"Erreur lors de la migration : {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
