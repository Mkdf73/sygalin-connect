from fastapi import Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

logger = logging.getLogger("rate_limiter")

# Initialize limiter with Redis backend if available, fallback to in-memory
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri="memory://",  # Change to "redis://redis:6379/1" for production
)


async def rate_limit_error_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(f"Rate limit exceeded for {get_remote_address(request)}")
    raise HTTPException(
        status_code=429,
        detail="Too many requests. Please try again later.",
    )
