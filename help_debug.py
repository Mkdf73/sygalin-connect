import sqlite3
import os

db_path = "backend/sygalin_connect.db"

def helper():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("--- Approving all PENDING Sender IDs ---")
    cursor.execute("UPDATE sender_ids SET status = 'approved' WHERE status = 'pending'")
    print(f"Approvals: {cursor.rowcount}")

    print("\n--- Adding 5000 SMS credits to all users ---")
    cursor.execute("UPDATE users SET sms_balance = sms_balance + 5000")
    print(f"Credits added: {cursor.rowcount}")

    print("\n--- Activating all PENDING users ---")
    cursor.execute("UPDATE users SET status = 'active' WHERE status = 'pending'")
    print(f"Activations: {cursor.rowcount}")

    conn.commit()
    conn.close()
    print("\nDone! Please refresh the page.")

if __name__ == "__main__":
    helper()
