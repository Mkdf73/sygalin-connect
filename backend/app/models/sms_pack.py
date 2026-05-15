import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime
from app.database import Base


class SmsPack(Base):
    __tablename__ = "sms_packs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    sms_count = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String, default="XAF")
    validity_days = Column(Integer, default=365)
    is_active = Column(Boolean, default=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
