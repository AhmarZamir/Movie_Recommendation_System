import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2] 
load_dotenv(BASE_DIR / ".env", override=True)

def get_list_env(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        raw = default
    return [x.strip() for x in raw.split(",") if x.strip()]

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = os.getenv("TMDB_BASE_URL", "https://api.themoviedb.org/3").rstrip("/")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

CORS_ORIGINS = get_list_env(
    "CORS_ORIGINS",
)

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
