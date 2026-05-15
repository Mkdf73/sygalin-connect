from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime


class TestSmsSend(BaseModel):
    """Schema for test SMS sending"""
    phone: str
    message: str

    @validator("phone")
    def validate_phone(cls, v):
        if not v or len(v) < 10:
            raise ValueError("Phone number must be at least 10 digits")
        return v

    @validator("message")
    def validate_message(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Message cannot be empty")
        if len(v) > 1000:
            raise ValueError("Message cannot exceed 1000 characters")
        return v


class CampaignSendRequest(BaseModel):
    """Request to send a campaign immediately"""
    campaign_id: str


class SmsSendResponse(BaseModel):
    """Response from SMS sending"""
    success: bool
    provider: str
    total_cost: float
    messages: List[dict]
    error: Optional[str] = None
    provider_response: Optional[dict] = None

    class Config:
        from_attributes = True
