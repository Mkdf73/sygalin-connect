from pydantic import BaseModel
from datetime import datetime

class ChatMessageCreate(BaseModel):
    recipient_id: str
    content: str

class ChatMessageResponse(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    content: str
    is_read: bool
    timestamp: datetime

    class Config:
        from_attributes = True

class UnreadCount(BaseModel):
    user_id: str
    count: int
