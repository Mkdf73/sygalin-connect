import uuid
import random
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, Enum as SAEnum, ForeignKey
from app.database import Base
import enum


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    COMPLETED = "completed"
    FAILED = "failed"


class MessageStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    message_content = Column(Text, nullable=False)
    sender_id = Column(String, ForeignKey("sender_ids.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    encoding = Column(String, default="GSM")
    total_recipients = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    sms_per_message = Column(Integer, default=1)
    total_sms_used = Column(Integer, default=0)
    status = Column(SAEnum(CampaignStatus), default=CampaignStatus.DRAFT)
    is_scheduled = Column(Boolean, default=False)
    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    provider_name = Column(String, nullable=True)
    provider_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    contact_phone = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    status = Column(SAEnum(MessageStatus), default=MessageStatus.PENDING)
    external_id = Column(String, nullable=True)
    provider_response = Column(Text, nullable=True)
    error_message = Column(String, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
