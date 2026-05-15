import sqlite3
import os

DB_PATH = "backend/sygalin_connect.db"

def reset_sms():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("--- Resetting sms_balance to 0 for all CLIENTS ---")
    cursor.execute("UPDATE users SET sms_balance = 0 WHERE role = 'client'")
    print(f"Updated clients: {cursor.rowcount}")

    conn.commit()
    conn.close()
    print("Done.")

if __name__ == "__main__":
    reset_sms()
