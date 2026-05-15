#!/usr/bin/env python3
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
SYS_PATH = str(BACKEND_DIR)
if SYS_PATH not in sys.path:
    sys.path.insert(0, SYS_PATH)

env_path = ROOT_DIR / ".env"
if not env_path.exists():
    env_path = BACKEND_DIR / ".env"

if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    raise RuntimeError(
        "Aucun fichier .env trouvé. Copiez .env.example en .env à la racine du projet ou dans backend/."
    )

from app.config import DATABASE_URL
from app.database import Base
from app.models.user import User
from app.models.sms_pack import SmsPack
from app.models.sender_id import SenderID
from app.models.contact import Contact, Group, contact_group
from app.models.campaign import Campaign, Message
from app.models.notification import Transaction, Notification
from app.models.chat_message import ChatMessage

SOURCE_DB_PATH = BACKEND_DIR / "sygalin_connect.db"
SOURCE_DATABASE_URL = f"sqlite:///{SOURCE_DB_PATH}"

if not SOURCE_DB_PATH.exists():
    raise FileNotFoundError(f"Le fichier source SQLite est introuvable : {SOURCE_DB_PATH}")

if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
    raise RuntimeError(
        "DATABASE_URL doit pointer vers PostgreSQL avant d'exécuter la migration."
    )

source_engine = create_engine(SOURCE_DATABASE_URL, connect_args={"check_same_thread": False})
target_engine = create_engine(DATABASE_URL, echo=False)
SourceSession = sessionmaker(bind=source_engine, autoflush=False, future=True)
TargetSession = sessionmaker(bind=target_engine, autoflush=False, future=True)

MODEL_SYNC_ORDER = [
    User,
    SmsPack,
    SenderID,
    Group,
    Contact,
    Campaign,
    Message,
    Transaction,
    Notification,
    ChatMessage,
]


def sync_table(source_session, target_session, model):
    rows = source_session.query(model).all()
    count = 0

    for row in rows:
        values = {column.name: getattr(row, column.name) for column in model.__table__.columns}
        existing = target_session.get(model, values["id"])

        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
        else:
            target_session.add(model(**values))

        count += 1

    target_session.commit()
    return count


def sync_contact_groups(source_session, target_session):
    rows = source_session.execute(select(contact_group)).all()
    count = 0

    for row in rows:
        statement = select(contact_group).where(
            contact_group.c.contact_id == row.contact_id,
            contact_group.c.group_id == row.group_id,
        )
        existing = target_session.execute(statement).first()
        if not existing:
            target_session.execute(
                contact_group.insert().values(
                    contact_id=row.contact_id,
                    group_id=row.group_id,
                )
            )
            count += 1

    target_session.commit()
    return count


def main():
    print("Démarrage de la migration SQLite → PostgreSQL")
    print(f"Source SQLite : {SOURCE_DATABASE_URL}")
    print(f"Cible PostgreSQL : {DATABASE_URL}")

    Base.metadata.create_all(bind=target_engine)

    with SourceSession() as source_session, TargetSession() as target_session:
        summary = {}
        for model in MODEL_SYNC_ORDER:
            model_name = model.__tablename__
            summary[model_name] = sync_table(source_session, target_session, model)

        summary["contact_group"] = sync_contact_groups(source_session, target_session)

    print("Migration terminée avec succès")
    for table_name, count in summary.items():
        print(f"  - {table_name}: {count} enregistrements synchronisés")


if __name__ == "__main__":
    main()
