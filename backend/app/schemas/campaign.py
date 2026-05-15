from pydantic import BaseModel, field_validator
from datetime import datetime


class CampaignCreate(BaseModel):
    name: str
    message_content: str
    sender_id: str
    encoding: str = "GSM"
    contact_ids: list[str] = []
    group_ids: list[str] = []
    is_scheduled: bool = False
    scheduled_at: datetime | None = None

    @field_validator("message_content")
    @classmethod
    def validate_message(cls, v):
        if len(v) == 0:
            raise ValueError("Le message ne peut pas Ãªtre vide")
        return v


class CampaignResponse(BaseModel):
    id: str
    name: str
    message_content: str
    sender_id: str
    user_id: str
    encoding: str
    total_recipients: int
    sent_count: int
    delivered_count: int
    failed_count: int
    sms_per_message: int
    total_sms_used: int
    status: str
    is_scheduled: bool
    scheduled_at: datetime | None = None
    completed_at: datetime | None = None
    provider_name: str | None = None
    provider_response: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    campaign_id: str
    contact_phone: str
    contact_name: str | None = None
    status: str
    external_id: str | None = None
    error_message: str | None = None
    provider_response: str | None = None
    sent_at: datetime | None = None
    delivered_at: datetime | None = None

    class Config:
        from_attributes = True
