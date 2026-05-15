from pydantic import BaseModel
from datetime import datetime


class SmsPackCreate(BaseModel):
    name: str
    sms_count: int
    price: float
    currency: str = "XAF"
    validity_days: int = 365
    description: str | None = None


class SmsPackUpdate(BaseModel):
    name: str | None = None
    sms_count: int | None = None
    price: float | None = None
    currency: str | None = None
    validity_days: int | None = None
    description: str | None = None
    is_active: bool | None = None


class SmsPackResponse(BaseModel):
    id: str
    name: str
    sms_count: int
    price: float
    currency: str
    validity_days: int
    is_active: bool
    description: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseRequest(BaseModel):
    pack_id: str
    payment_method: str | None = None
    payment_details: str | None = None
