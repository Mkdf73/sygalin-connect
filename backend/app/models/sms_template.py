import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean
from app.database import Base


class SmsTemplate(Base):
    __tablename__ = "sms_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    content = Column(Text, nullable=False)  # Template with {{var}} placeholders
    variables = Column(String, nullable=True)  # JSON array of variable names
    category = Column(String, nullable=True)  # e.g., "marketing", "transactional"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
