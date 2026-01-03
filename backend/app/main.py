from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME
from app.db.database import Base, engine, SessionLocal
import app.models
from app.models.user import User
from app.core.security import hash_password

from app.routers import (
    auth_router,
    tmdb_router,
    playlists_router,
    ratings_router,
    reviews_router,
    admin_router,
    recommendations_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if engine.url.get_backend_name() == "sqlite":
            conn = engine.raw_connection()
            try:
                cursor = conn.cursor()
                cursor.execute("PRAGMA table_info(users)")
                cols = {row[1] for row in cursor.fetchall()}
                if "is_active" not in cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1")
                if "is_blocked" not in cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT 0")
                if "last_login" not in cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN last_login DATETIME")
                conn.commit()
            finally:
                conn.close()

        if ADMIN_EMAIL and ADMIN_PASSWORD:
            admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
            if not admin:
                admin = User(
                    email=ADMIN_EMAIL,
                    name=ADMIN_USERNAME or "admin",
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role="ADMIN",
                    is_active=True,
                    is_blocked=False,
                )
                db.add(admin)
                db.commit()
            elif admin.role != "ADMIN":
                admin.role = "ADMIN"
                db.commit()
    finally:
        db.close()
    yield

def create_app() -> FastAPI:
    app = FastAPI(title="Movie Recommendation API", lifespan=lifespan)

    origins = CORS_ORIGINS

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1):5173",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' https://image.tmdb.org data: blob:; "
            "connect-src 'self' https://api.themoviedb.org http://localhost:8000; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self'; "
            "font-src 'self' data:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    # Routers
    app.include_router(auth_router)
    app.include_router(tmdb_router)
    app.include_router(recommendations_router)
    app.include_router(playlists_router)
    app.include_router(ratings_router)
    app.include_router(reviews_router)
    app.include_router(admin_router)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app

app = create_app()
