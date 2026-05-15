import asyncio
import concurrent.futures
import logging
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from .config import CORS_ORIGINS
from .database import init_db
from .middleware import LoggingMiddleware, SecurityHeadersMiddleware
from .routers import admin, auth, chat, client, email, sms
from .utils.rate_limit import limiter, rate_limit_error_handler


logger = logging.getLogger("sygalin.main")


def create_app() -> FastAPI:
    app = FastAPI(
        title="SYGALIN CONNECT API",
        description="Plateforme de vente et d'envoi de SMS en masse",
        version="1.0.0",
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(LoggingMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_error_handler)

    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(admin.router, prefix="/api/v1")
    app.include_router(client.router, prefix="/api/v1")
    app.include_router(email.router, prefix="/api/v1")
    app.include_router(chat.router, prefix="/api/v1")
    app.include_router(sms.router, prefix="/api/v1")

    @app.on_event("startup")
    async def on_startup():
        init_db()
        seed_admin()
        asyncio.create_task(run_scheduler())

    @app.get("/")
    def root():
        return {"message": "SYGALIN CONNECT API v1.0", "docs": "/docs"}

    return app


async def run_scheduler():
    from app.config import DATABASE_URL
    from app.database import SessionLocal
    from app.models.campaign import Campaign, CampaignStatus
    from app.routers.client import simulate_sms_sending_sync

    loop = asyncio.get_event_loop()
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=5)

    while True:
        try:
            db = SessionLocal()
            now = datetime.now(timezone.utc)
            campaigns = db.query(Campaign).filter(
                Campaign.status == CampaignStatus.SCHEDULED,
                Campaign.scheduled_at <= now,
            ).all()

            for camp in campaigns:
                camp.status = CampaignStatus.SENDING
                db.commit()
                loop.run_in_executor(pool, simulate_sms_sending_sync, camp.id, DATABASE_URL)
        except Exception:
            logger.exception("Erreur du scheduler")
        finally:
            if "db" in locals():
                db.close()

        await asyncio.sleep(60)


def seed_admin():
    """Create the default Sygalin admin only from secure environment values."""
    from app.config import (
        SYGALIN_ADMIN_COMPANY,
        SYGALIN_ADMIN_EMAIL,
        SYGALIN_ADMIN_FIRST_NAME,
        SYGALIN_ADMIN_LAST_NAME,
        SYGALIN_ADMIN_PASSWORD,
        SYGALIN_ADMIN_SEED_ENABLED,
        SYGALIN_ADMIN_SMS_BALANCE,
    )
    from app.database import SessionLocal
    from app.models.user import User, UserRole, UserStatus
    from app.utils.security import get_password_hash

    if not SYGALIN_ADMIN_SEED_ENABLED:
        logger.info("Initialisation admin desactivee par configuration")
        return

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == UserRole.SYGALIN).first()
        if existing:
            return

        if not SYGALIN_ADMIN_PASSWORD or SYGALIN_ADMIN_PASSWORD == "change_this_admin_password":
            logger.warning("Admin Sygalin non cree: SYGALIN_ADMIN_PASSWORD absent ou placeholder")
            return

        admin_user = User(
            email=SYGALIN_ADMIN_EMAIL,
            hashed_password=get_password_hash(SYGALIN_ADMIN_PASSWORD),
            first_name=SYGALIN_ADMIN_FIRST_NAME,
            last_name=SYGALIN_ADMIN_LAST_NAME,
            company=SYGALIN_ADMIN_COMPANY,
            role=UserRole.SYGALIN,
            status=UserStatus.ACTIVE,
            sms_balance=SYGALIN_ADMIN_SMS_BALANCE,
        )
        db.add(admin_user)
        db.commit()
        logger.info("Compte admin Sygalin cree: %s", SYGALIN_ADMIN_EMAIL)
    finally:
        db.close()


app = create_app()
