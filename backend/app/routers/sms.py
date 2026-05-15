from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserStatus
from app.schemas.sms import TestSmsSend, SmsSendResponse
from app.services.sms_gateway import sms_gateway
from app.utils.dependencies import get_current_user, require_active_client

router = APIRouter(prefix="/client/sms", tags=["SMS Testing"])


@router.post("/test-send", response_model=SmsSendResponse, status_code=200)
async def test_send_sms(
    data: TestSmsSend,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_client),
):
    """
    Test endpoint to send a single SMS without deducting credits.
    Useful for testing SMS provider configuration.
    
    **Parameters:**
    - `phone`: Destination phone number (e.g., +237612345678)
    - `message`: SMS message content (max 1000 chars)
    
    **Response:**
    - `success`: Whether SMS was sent successfully
    - `provider`: SMS provider used
    - `total_cost`: Estimated cost
    - `messages`: Array of individual message responses
    - `error`: Error message if failed
    """
    result = await sms_gateway.send_single(
        to=data.phone,
        message=data.message,
        sender_id=None,
        encoding="GSM",
    )
    
    return SmsSendResponse(
        success=result.success,
        provider=result.provider,
        total_cost=result.total_cost,
        messages=result.messages,
        error=result.error,
        provider_response=result.provider_response,
    )
