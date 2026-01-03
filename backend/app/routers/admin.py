from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pathlib import Path
import pandas as pd

from app.db.database import get_db
from app.models.user import User
from app.models.review import Review
from app.models.rating import Rating
from app.core.deps import require_admin
from app.schemas.user import UserOut, UserRoleUpdate, AdminUserOut, AdminUserUpdate
from app.schemas.movie import MovieOut, MovieCreate, MovieUpdate, AdminAnalytics

router = APIRouter(prefix="/admin", tags=["admin"])

DATA_CSV = Path(__file__).resolve().parents[2] / "data" / "movies.csv"

def _load_movies_df() -> pd.DataFrame:
    if not DATA_CSV.exists():
        raise HTTPException(status_code=500, detail=f"Missing data file: {DATA_CSV}")
    return pd.read_csv(DATA_CSV)

def _save_movies_df(df: pd.DataFrame) -> None:
    df.to_csv(DATA_CSV, index=False)

@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    return db.query(User).order_by(User.id.desc()).limit(500).all()

@router.patch("/users/{user_id}/role", response_model=UserOut)
def set_role(user_id: int, payload: UserRoleUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role not in ("USER","ADMIN"):
        raise HTTPException(status_code=400, detail="role must be USER or ADMIN")
    u.role = payload.role
    db.commit()
    db.refresh(u)
    return u


@router.put("/users/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None:
        u.name = payload.name.strip()
    if payload.email is not None:
        u.email = payload.email.strip().lower()
    if payload.role is not None:
        if payload.role not in ("USER", "ADMIN"):
            raise HTTPException(status_code=400, detail="role must be USER or ADMIN")
        u.role = payload.role
    if payload.is_blocked is not None:
        u.is_blocked = bool(payload.is_blocked)
    if payload.is_active is not None:
        u.is_active = bool(payload.is_active)

    db.commit()
    db.refresh(u)
    return u


@router.post("/users/{user_id}/block", response_model=AdminUserOut)
def block_user(user_id: int, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_blocked = True
    db.commit()
    db.refresh(u)
    return u


@router.post("/users/{user_id}/unblock", response_model=AdminUserOut)
def unblock_user(user_id: int, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_blocked = False
    db.commit()
    db.refresh(u)
    return u


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(u)
    db.commit()
    return


@router.get("/movies", response_model=list[MovieOut])
def list_movies(_admin: User = Depends(require_admin)):
    df = _load_movies_df()
    df = df.where(pd.notna(df), None)
    return df.to_dict(orient="records")


@router.post("/movies", response_model=MovieOut, status_code=201)
def create_movie(payload: MovieCreate, _admin: User = Depends(require_admin)):
    df = _load_movies_df()
    movie_id = payload.movie_id
    if movie_id is None:
        movie_id = int(df["movie_id"].max()) + 1 if not df.empty else 1
    if (df["movie_id"] == movie_id).any():
        raise HTTPException(status_code=409, detail="movie_id already exists")

    row = {
        "title": payload.title.strip(),
        "movie_id": int(movie_id),
        "genres": payload.genres or "",
        "rating": float(payload.rating) if payload.rating is not None else None,
        "overview": payload.overview or "",
    }
    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    _save_movies_df(df)
    return row


@router.put("/movies/{movie_id}", response_model=MovieOut)
def update_movie(movie_id: int, payload: MovieUpdate, _admin: User = Depends(require_admin)):
    df = _load_movies_df()
    idx = df.index[df["movie_id"] == movie_id].tolist()
    if not idx:
        raise HTTPException(status_code=404, detail="Movie not found")

    i = idx[0]
    if payload.title is not None:
        df.at[i, "title"] = payload.title.strip()
    if payload.genres is not None:
        df.at[i, "genres"] = payload.genres
    if payload.rating is not None:
        df.at[i, "rating"] = float(payload.rating)
    if payload.overview is not None:
        df.at[i, "overview"] = payload.overview

    _save_movies_df(df)
    row = df.loc[i].where(pd.notna(df.loc[i]), None).to_dict()
    return row


@router.delete("/movies/{movie_id}", status_code=204)
def delete_movie(movie_id: int, _admin: User = Depends(require_admin)):
    df = _load_movies_df()
    if not (df["movie_id"] == movie_id).any():
        raise HTTPException(status_code=404, detail="Movie not found")
    df = df[df["movie_id"] != movie_id]
    _save_movies_df(df)
    return


@router.get("/analytics", response_model=AdminAnalytics)
def analytics(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    top_movies = (
        db.query(
            Review.tmdb_id,
            Review.media_type,
            func.count(Review.id).label("reviews"),
        )
        .filter(Review.parent_id == None)  # noqa
        .group_by(Review.tmdb_id, Review.media_type)
        .order_by(func.count(Review.id).desc())
        .limit(10)
        .all()
    )

    avg_scores = dict(
        db.query(Rating.tmdb_id, func.avg(Rating.score))
        .group_by(Rating.tmdb_id)
        .all()
    )

    top_users = (
        db.query(
            User.id,
            User.name,
            User.email,
            func.count(Review.id).label("reviews"),
        )
        .join(Review, Review.user_id == User.id)
        .filter(Review.parent_id == None)  # noqa
        .group_by(User.id)
        .order_by(func.count(Review.id).desc())
        .limit(10)
        .all()
    )

    return AdminAnalytics(
        top_movies=[
            {
                "tmdb_id": int(r.tmdb_id),
                "media_type": int(r.media_type),
                "reviews": int(r.reviews),
                "avg_score": float(avg_scores.get(r.tmdb_id) or 0),
            }
            for r in top_movies
        ],
        top_users=[
            {
                "user_id": int(u.id),
                "name": u.name,
                "email": u.email,
                "reviews": int(u.reviews),
            }
            for u in top_users
        ],
    )
