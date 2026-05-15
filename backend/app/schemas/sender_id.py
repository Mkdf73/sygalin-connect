from pydantic import BaseModel, field_validator
from datetime import datetime
import re


class SenderIDCreate(BaseModel):
    name: str
    usage_type: str
    description: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if len(v) > 11:
            raise ValueError("Le Sender ID ne peut pas dÃ©passer 11 caractÃ¨res")
        if not re.match(r"^[a-zA-Z0-9\-]+$", v):
            raise ValueError("Le Sender ID ne peut contenir que des caractÃ¨res alphanumÃ©riques et des tirets")
        if " " in v:
            raise ValueError("Le Sender ID ne peut pas contenir d'espaces")
        return v


class SenderIDResponse(BaseModel):
    id: str
    name: str
    usage_type: str
    description: str | None = None
    status: str
    rejection_reason: str | None = None
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class SenderApproval(BaseModel):
    note: str | None = None


class SenderRejection(BaseModel):
    reason: str
