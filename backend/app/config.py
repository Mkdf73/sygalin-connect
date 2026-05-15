import os
from pathlib import Path

from dotenv import load_dotenv


_root_env_path = Path(__file__).resolve().parents[2] / ".env"
_backend_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_root_env_path if _root_env_path.exists() else _backend_env_path)


def _env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).lower() in ("1", "true", "yes", "on")


def _env_int(name: str, default: str) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc


DEBUG = _env_bool("DEBUG")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://sygalin:sygalin_pass@localhost:5432/sygalin_connect",
)

SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY must be defined in .env")
if not DEBUG and SECRET_KEY in {"change_me", "fallback-secret-key"}:
    raise RuntimeError("SECRET_KEY must be changed before running outside debug mode")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = _env_int("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
REFRESH_TOKEN_EXPIRE_DAYS = _env_int("REFRESH_TOKEN_EXPIRE_DAYS", "7")
USE_ALEMBIC = _env_bool("USE_ALEMBIC", "true")

DEFAULT_CORS_ORIGINS = ",".join(
    [
        "http://localhost",
        "http://localhost:80",
        "http://127.0.0.1",
        "http://127.0.0.1:80",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
)
CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

SYGALIN_ADMIN_SEED_ENABLED = _env_bool("SYGALIN_ADMIN_SEED_ENABLED", "true")
SYGALIN_ADMIN_EMAIL = os.getenv("SYGALIN_ADMIN_EMAIL", "admin@sygalin.com")
SYGALIN_ADMIN_PASSWORD = os.getenv("SYGALIN_ADMIN_PASSWORD", "")
SYGALIN_ADMIN_FIRST_NAME = os.getenv("SYGALIN_ADMIN_FIRST_NAME", "Sygalin")
SYGALIN_ADMIN_LAST_NAME = os.getenv("SYGALIN_ADMIN_LAST_NAME", "Admin")
SYGALIN_ADMIN_COMPANY = os.getenv("SYGALIN_ADMIN_COMPANY", "Sygalin")
SYGALIN_ADMIN_SMS_BALANCE = _env_int("SYGALIN_ADMIN_SMS_BALANCE", "100000")

SMS_PROVIDER = os.getenv("SMS_PROVIDER", "sandbox")
SMS_API_KEY = os.getenv("SMS_API_KEY", "")
SMS_API_URL = os.getenv("SMS_API_URL", "")
SMS_SENDER_ID = os.getenv("SMS_SENDER_ID", "SYGALIN")
SMS_SANDBOX = _env_bool("SMS_SANDBOX", "true")
SMS_TIMEOUT_SECONDS = _env_int("SMS_TIMEOUT_SECONDS", "30")
SMS_RETRIES = _env_int("SMS_RETRIES", "2")
SMS_RATE_LIMIT = _env_int("SMS_RATE_LIMIT", "10")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = _env_int("SMTP_PORT", "465")
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
