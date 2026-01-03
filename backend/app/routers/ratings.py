# app/routers/ratings.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

from app.db.database import get_db
from app.models.rating import Rating
from app.models.user import User
from app.core.deps import get_current_user
from app.schemas.rating import RatingUpsert, RatingOut, RatingAggregate, RatingBreakdown

router = APIRouter(prefix="/ratings", tags=["ratings"])

@router.get("/me", response_model=list[RatingOut])
def my_ratings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Rating).filter(Rating.user_id == user.id).order_by(Rating.updated_at.desc()).all()
    return [RatingOut(tmdb_id=r.tmdb_id, media_type=r.media_type, score=r.score) for r in rows]

@router.put("", response_model=RatingOut)
def upsert_rating(payload: RatingUpsert, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(Rating).filter(
        Rating.user_id == user.id,
        Rating.tmdb_id == payload.tmdb_id,
        Rating.media_type == payload.media_type,
    ).first()
    if row:
        row.score = payload.score
        db.commit()
        db.refresh(row)
        return RatingOut(tmdb_id=row.tmdb_id, media_type=row.media_type, score=row.score)

    row = Rating(user_id=user.id, tmdb_id=payload.tmdb_id, media_type=payload.media_type, score=payload.score)
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not save rating")
    return RatingOut(tmdb_id=row.tmdb_id, media_type=row.media_type, score=row.score)

@router.get("/{tmdb_id}", response_model=RatingAggregate)
def aggregate(tmdb_id: int, media_type: int = 0, db: Session = Depends(get_db)):
    avg_score, count = db.query(func.avg(Rating.score), func.count(Rating.id)).filter(
        Rating.tmdb_id == tmdb_id,
        Rating.media_type == media_type,
    ).first()
    return RatingAggregate(
        tmdb_id=tmdb_id,
        media_type=media_type,
        avg_score=float(avg_score) if avg_score is not None else 0.0,
        count=int(count or 0),
    )

@router.delete("/{tmdb_id}", status_code=204)
def delete_rating(tmdb_id: int, media_type: int = 0, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    deleted = db.query(Rating).filter(
        Rating.user_id == user.id,
        Rating.tmdb_id == tmdb_id,
        Rating.media_type == media_type,
    ).delete()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Rating not found")
    return

@router.get("/my-score/{tmdb_id}", response_model=RatingOut)
def my_score(
    tmdb_id: int,
    media_type: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(Rating).filter(
        Rating.user_id == user.id,
        Rating.tmdb_id == tmdb_id,
        Rating.media_type == media_type,
    ).first()

    if not row:
        return RatingOut(tmdb_id=tmdb_id, media_type=media_type, score=0)

    return RatingOut(tmdb_id=row.tmdb_id, media_type=row.media_type, score=int(row.score))

@router.get("/breakdown/{tmdb_id}", response_model=RatingBreakdown)
def breakdown(
    tmdb_id: int,
    media_type: int = 0,
    db: Session = Depends(get_db),
):
    avg_score, count = db.query(func.avg(Rating.score), func.count(Rating.id)).filter(
        Rating.tmdb_id == tmdb_id,
        Rating.media_type == media_type,
    ).first()

    rows = db.query(Rating.score, func.count(Rating.id)).filter(
        Rating.tmdb_id == tmdb_id,
        Rating.media_type == media_type,
    ).group_by(Rating.score).all()

    counts = {int(score): int(c) for score, c in rows if score is not None}
    br = {i: counts.get(i, 0) for i in range(1, 6)}

    return RatingBreakdown(
        tmdb_id=tmdb_id,
        media_type=media_type,
        avg_score=float(avg_score) if avg_score is not None else 0.0,
        count=int(count or 0),
        breakdown=br,
    )