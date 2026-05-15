from pydantic import BaseModel
from datetime import datetime


class ContactCreate(BaseModel):
    phone: str
    name: str | None = None
    email: str | None = None
    group_id: str | None = None


class ContactResponse(BaseModel):
    id: str
    phone: str
    name: str | None = None
    email: str | None = None
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class GroupCreate(BaseModel):
    name: str
    description: str | None = None
    contact_ids: list[str] = []


class GroupResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    user_id: str
    contact_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class GroupUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    contact_ids: list[str] | None = None
