import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Enum as SAEnum, ForeignKey, Boolean, Text
from app.database import Base
import enum


class TransactionType(str, enum.Enum):
    PURCHASE = "purchase"
    ALLOCATION = "allocation"
    CAMPAIGN_DEBIT = "campaign_debit"
    REFUND = "refund"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    sms_count = Column(Integer, nullable=False)
    amount = Column(Float, default=0)
    currency = Column(String, default="XAF")
    pack_id = Column(String, ForeignKey("sms_packs.id"), nullable=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=True)
    reference = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class NotificationType(str, enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(SAEnum(NotificationType), default=NotificationType.INFO)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
