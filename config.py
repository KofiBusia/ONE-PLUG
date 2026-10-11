"""App configuration. Every value can be overridden with an environment variable."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        instance = BASE_DIR / "instance"
        instance.mkdir(exist_ok=True)
        return f"sqlite:///{instance / 'oneplug.db'}"
    # Render gives a bare "postgresql://" (or the old "postgres://") URL; SQLAlchemy's
    # default driver resolution for that no longer lands on psycopg2, so name the
    # driver explicitly rather than rely on it guessing.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
    GOOGLE_MAP_ID = os.getenv("GOOGLE_MAP_ID", "")

    # 3 photos x ~150 KB each fits comfortably; anything bigger is refused
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 2 * 1024 * 1024))

    # Seed the demo networks on first boot when the stations table is empty
    AUTO_SEED = os.getenv("AUTO_SEED", "1") == "1"

    # memory:// is fine for one instance; use redis://... when you run more than one worker/dyno
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_ENABLED = True
    RATELIMIT_HEADERS_ENABLED = True


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
