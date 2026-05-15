import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, ForeignKey
from app.database import Base
import enum


class SenderStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class SenderUsage(str, enum.Enum):
    COMMERCIAL = "commercial"
    TRANSACTIONAL = "transactional"
    INFORMATIONAL = "informational"


class SenderID(Base):
    __tablename__ = "sender_ids"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(11), nullable=False)
    usage_type = Column(SAEnum(SenderUsage), nullable=False)
    description = Column(String(300), nullable=True)
    status = Column(SAEnum(SenderStatus), default=SenderStatus.PENDING, nullable=False)
    rejection_reason = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
