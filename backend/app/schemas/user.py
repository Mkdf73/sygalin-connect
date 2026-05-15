from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    company: str | None = None
    phone: str | None = None
    country: str
    role: str
    status: str
    sms_balance: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    company: str | None = None
    phone: str | None = None
    country: str | None = None


class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str


class ClientValidation(BaseModel):
    note: str | None = None


class ClientRejection(BaseModel):
    reason: str


class AllocateSmsRequest(BaseModel):
    user_id: str
    sms_count: int
    reference: str | None = None
