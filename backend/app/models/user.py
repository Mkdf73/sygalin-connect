import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum, Integer
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    SYGALIN = "sygalin"
    CLIENT = "client"


class UserStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    company = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    country = Column(String, default="CM")
    role = Column(SAEnum(UserRole), default=UserRole.CLIENT, nullable=False)
    status = Column(SAEnum(UserStatus), default=UserStatus.PENDING, nullable=False)
    sms_balance = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True)
    rejection_reason = Column(String, nullable=True)
    last_password_reset_request = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
