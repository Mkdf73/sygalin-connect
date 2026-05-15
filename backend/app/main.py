from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from .config import CORS_ORIGINS
from .database import init_db
from .middleware import SecurityHeadersMiddleware, LoggingMiddleware
from .utils.rate_limit import limiter, rate_limit_error_handler
from .routers import auth, admin, client, email, chat, sms


def create_app() -> FastAPI:
    app = FastAPI(
        title="SYGALIN CONNECT API",
        description="Plateforme de vente et d'envoi de SMS en masse",
        version="1.0.0",
    )

    # Add security middleware
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(LoggingMiddleware)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add rate limiter
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
        import asyncio
        init_db()
        seed_admin()
        asyncio.create_task(run_scheduler())

    @app.get("/")
    def root():
        return {"message": "SYGALIN CONNECT API v1.0", "docs": "/docs"}

    return app


async def run_scheduler():
    import asyncio
    import concurrent.futures
    from datetime import datetime, timezone
    from app.database import SessionLocal
    from app.models.campaign import Campaign, CampaignStatus
    from app.routers.client import simulate_sms_sending_sync
    from app.config import DATABASE_URL
    
    loop = asyncio.get_event_loop()
    pool = concurrent.futures.ThreadPoolExecutor(max_workers=5)
    
    while True:
        try:
            db = SessionLocal()
            now = datetime.now(timezone.utc)
            campaigns = db.query(Campaign).filter(
                Campaign.status == CampaignStatus.SCHEDULED,
                Campaign.scheduled_at <= now
            ).all()

            for camp in campaigns:
                camp.status = "sending" # Will fall back to enum parsing
                db.commit()
                loop.run_in_executor(pool, simulate_sms_sending_sync, camp.id, DATABASE_URL)
        except Exception as e:
            print("Erreur du scheduler:", e)
        finally:
            if 'db' in locals():
                db.close()
                
        await asyncio.sleep(60)



def seed_admin():
    """CrÃ©e le compte admin Sygalin par dÃ©faut s'il n'existe pas."""
    from app.database import SessionLocal
    from app.models.user import User, UserRole, UserStatus
    from app.utils.security import get_password_hash

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.role == UserRole.SYGALIN).first()
        if not existing:
            admin = User(
                email="admin@sygalin.com",
                hashed_password=get_password_hash("Admin@2026"),
                first_name="Sygalin",
                last_name="Admin",
                company="Sygalin",
                role=UserRole.SYGALIN,
                status=UserStatus.ACTIVE,
                sms_balance=100000,
            )
            db.add(admin)
            db.commit()
            print("Compte admin Sygalin crÃ©Ã©: admin@sygalin.com / Admin@2026")
    finally:
        db.close()


app = create_app()
