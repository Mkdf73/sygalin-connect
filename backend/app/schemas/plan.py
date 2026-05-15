from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PlanResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    sms_monthly_limit: int
    price_monthly: float
    features: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sms_monthly_limit: int
    price_monthly: float
    features: Optional[str] = None


class SmsTemplateResponse(BaseModel):
    id: str
    name: str
    content: str
    variables: Optional[str]
    category: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SmsTemplateCreate(BaseModel):
    name: str
    content: str
    variables: Optional[List[str]] = None
    category: Optional[str] = None


class SmsTemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
