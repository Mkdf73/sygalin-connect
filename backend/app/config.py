import os
from pathlib import Path
from dotenv import load_dotenv

_root_env_path = Path(__file__).resolve().parents[2] / ".env"
_backend_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_root_env_path if _root_env_path.exists() else _backend_env_path)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://sygalin:sygalin_pass@localhost:5432/sygalin_connect"
)
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
DEBUG = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
USE_ALEMBIC = os.getenv("USE_ALEMBIC", "true").lower() in ("1", "true", "yes")
DEFAULT_CORS_ORIGINS = ",".join([
    "http://localhost",
    "http://localhost:80",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
SMS_PROVIDER = os.getenv("SMS_PROVIDER", "sandbox")
SMS_API_KEY = os.getenv("SMS_API_KEY", "")
SMS_API_URL = os.getenv("SMS_API_URL", "")
SMS_SENDER_ID = os.getenv("SMS_SENDER_ID", "SYGALIN")
SMS_SANDBOX = os.getenv("SMS_SANDBOX", "true").lower() in ("1", "true", "yes")
SMS_TIMEOUT_SECONDS = int(os.getenv("SMS_TIMEOUT_SECONDS", "30"))
SMS_RETRIES = int(os.getenv("SMS_RETRIES", "2"))
SMS_RATE_LIMIT = int(os.getenv("SMS_RATE_LIMIT", "10"))

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER", "your_email@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "your_app_password")
