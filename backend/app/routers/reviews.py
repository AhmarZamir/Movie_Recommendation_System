# app/routers/reviews.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, case, and_, or_

from app.db.database import get_db
from app.models.review import Review
from app.models.review_vote import ReviewVote
from app.models.user import User
from app.core.deps import get_current_user, require_admin
from app.schemas.review import ReviewCreate, ReviewVoteIn, ReviewOut, ReviewModerate, ReviewUpdate
from app.models.rating import Rating

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/me", response_model=list[ReviewOut])
def my_reviews(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    vote_sq = (
        db.query(
            ReviewVote.review_id.label("rid"),
            func.sum(case((ReviewVote.value == 1, 1), else_=0)).label("upvotes"),
            func.sum(case((ReviewVote.value == -1, 1), else_=0)).label("downvotes"),
        )
        .group_by(ReviewVote.review_id)
        .subquery()
    )

    rows = (
        db.query(
            Review,
            User.name.label("user_name"),
            func.coalesce(vote_sq.c.upvotes, 0).label("upvotes"),
            func.coalesce(vote_sq.c.downvotes, 0).label("downvotes"),
            func.coalesce(Rating.score, 0).label("user_score"),
        )
        .join(User, User.id == Review.user_id)
        .outerjoin(vote_sq, vote_sq.c.rid == Review.id)
        .outerjoin(
            Rating,
            and_(
                Rating.user_id == Review.user_id,
                Rating.tmdb_id == Review.tmdb_id,
                Rating.media_type == Review.media_type,
            ),
        )
        .filter(
            Review.user_id == user.id,
            Review.parent_id == None,  # noqa
            Review.status == "VISIBLE",
        )
        .order_by(Review.id.desc())
        .all()
    )

    out: list[ReviewOut] = []
    for r, user_name, up, down, user_score in rows:
        out.append(
            ReviewOut(
                id=r.id,
                user_id=r.user_id,
                user_name=user_name,
                tmdb_id=r.tmdb_id,
                media_type=r.media_type,
                parent_id=r.parent_id,
                content=r.content,
                status=r.status,
                created_at=r.created_at,
                updated_at=r.updated_at,
                upvotes=int(up or 0),
                downvotes=int(down or 0),
                user_score=int(user_score or 0),
            )
        )
    return out

@router.get("/{tmdb_id}", response_model=list[ReviewOut])
def list_reviews(tmdb_id: int, media_type: int = 0, db: Session = Depends(get_db)):
    vote_sq = (
        db.query(
            ReviewVote.review_id.label("rid"),
            func.sum(case((ReviewVote.value == 1, 1), else_=0)).label("upvotes"),
            func.sum(case((ReviewVote.value == -1, 1), else_=0)).label("downvotes"),
        )
        .group_by(ReviewVote.review_id)
        .subquery()
    )

    rows = (
        db.query(
            Review,
            User.name.label("user_name"),
            func.coalesce(vote_sq.c.upvotes, 0).label("upvotes"),
            func.coalesce(vote_sq.c.downvotes, 0).label("downvotes"),
            func.coalesce(Rating.score, 0).label("user_score"),
        )
        .join(User, User.id == Review.user_id)
        .outerjoin(vote_sq, vote_sq.c.rid == Review.id)
        .outerjoin(
            Rating,
            and_(
                Rating.user_id == Review.user_id,
                Rating.tmdb_id == Review.tmdb_id,
                Rating.media_type == Review.media_type,
            ),
        )
        .filter(
            Review.tmdb_id == tmdb_id,
            Review.media_type == media_type,
            Review.parent_id == None,  # noqa
            Review.status == "VISIBLE",
        )
        .order_by(Review.id.desc())
        .all()
    )

    out: list[ReviewOut] = []
    for r, user_name, up, down, user_score in rows:
        out.append(
            ReviewOut(
                id=r.id,
                user_id=r.user_id,
                user_name=user_name,
                tmdb_id=r.tmdb_id,
                media_type=r.media_type,
                parent_id=r.parent_id,
                content=r.content,
                status=r.status,
                created_at=r.created_at,
                updated_at=r.updated_at,
                upvotes=int(up or 0),
                downvotes=int(down or 0),
                user_score=int(user_score or 0),
            )
        )
    return out

@router.post("", response_model=ReviewOut, status_code=201)
def create_review(payload: ReviewCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.is_blocked or not user.is_active:
        raise HTTPException(status_code=403, detail="Account is not allowed to post reviews")
    if payload.parent_id is not None:
        parent = db.get(Review, payload.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent review not found")
    row = Review(
        user_id=user.id,
        tmdb_id=payload.tmdb_id,
        media_type=payload.media_type,
        parent_id=payload.parent_id,
        content=payload.content,
        status="VISIBLE",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.post("/{review_id}/vote", status_code=204)
def vote(review_id: int, payload: ReviewVoteIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.value not in (-1, 1):
        raise HTTPException(status_code=400, detail="Vote value must be -1 or 1")
    review = db.get(Review, review_id)
    if not review or review.status == "REMOVED":
        raise HTTPException(status_code=404, detail="Review not found")

    row = db.query(ReviewVote).filter(
        ReviewVote.review_id == review_id,
        ReviewVote.user_id == user.id,
    ).first()
    if row:
        row.value = payload.value
        db.commit()
        return

    row = ReviewVote(review_id=review_id, user_id=user.id, value=payload.value)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not save vote")
    return


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    hard: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):

    row = db.get(Review, review_id)
    if not row or row.status == "REMOVED":
        return

    is_admin = (user.role or "").upper() == "ADMIN"
    if user.is_blocked or not user.is_active:
        raise HTTPException(status_code=403, detail="Account is not allowed to modify reviews")
    if row.user_id != user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Not allowed to delete this review")

    if hard:
        if not is_admin:
            raise HTTPException(status_code=403, detail="Admin privileges required for hard delete")

        reply_ids = [r.id for r in db.query(Review.id).filter(Review.parent_id == review_id).all()]
        all_ids = [review_id] + reply_ids

        db.query(ReviewVote).filter(ReviewVote.review_id.in_(all_ids)).delete(synchronize_session=False)
        db.query(Review).filter(Review.id.in_(reply_ids)).delete(synchronize_session=False)
        db.delete(row)
        db.commit()
        return

    row.status = "REMOVED"
    db.query(Review).filter(Review.parent_id == review_id).update(
        {"status": "REMOVED"}, synchronize_session=False
    )
    db.commit()
    return

@router.get("/admin/all", response_model=list[ReviewOut])
def admin_list_all(
    q: str | None = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    query = db.query(Review, User.name.label("user_name")).join(User, User.id == Review.user_id)
    if q:
        term = f"%{q.strip()}%"
        digits = None
        try:
            digits = int(q.strip())
        except ValueError:
            digits = None
        filters = [Review.content.ilike(term), User.name.ilike(term)]
        if digits is not None:
            filters.extend([Review.user_id == digits, Review.tmdb_id == digits])
        query = query.filter(or_(*filters))

    rows = (
        query.order_by(Review.id.desc())
        .limit(500)
        .all()
    )
    out: list[ReviewOut] = []
    for r, user_name in rows:
        out.append(
            ReviewOut(
                id=r.id,
                user_id=r.user_id,
                user_name=user_name,
                tmdb_id=r.tmdb_id,
                media_type=r.media_type,
                parent_id=r.parent_id,
                content=r.content,
                status=r.status,
                created_at=r.created_at,
                updated_at=r.updated_at,
                upvotes=0,
                downvotes=0,
                user_score=0,
            )
        )
    return out

@router.patch("/admin/{review_id}", response_model=ReviewOut)
def admin_moderate(review_id: int, payload: ReviewModerate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    row = db.get(Review, review_id)
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")
    if payload.status not in ("VISIBLE","FLAGGED","REMOVED"):
        raise HTTPException(status_code=400, detail="Invalid status")
    if payload.status == "REMOVED":
        reply_ids = [r.id for r in db.query(Review.id).filter(Review.parent_id == review_id).all()]
        all_ids = [review_id] + reply_ids
        db.query(ReviewVote).filter(ReviewVote.review_id.in_(all_ids)).delete(synchronize_session=False)
        db.query(Review).filter(Review.id.in_(reply_ids)).delete(synchronize_session=False)
        out = ReviewOut(
            id=row.id,
            user_id=row.user_id,
            tmdb_id=row.tmdb_id,
            media_type=row.media_type,
            parent_id=row.parent_id,
            content=row.content,
            status="REMOVED",
            created_at=row.created_at,
            updated_at=row.updated_at,
            upvotes=0,
            downvotes=0,
            user_score=0,
        )
        db.delete(row)
        db.commit()
        return out

    row.status = payload.status
    db.commit()
    db.refresh(row)
    return row

@router.put("/{review_id}")
def edit_review(
    review_id: int,
    payload: ReviewUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    r = db.query(Review).filter(Review.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    if user.is_blocked or not user.is_active:
        raise HTTPException(status_code=403, detail="Account is not allowed to edit reviews")
    if r.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    r.content = payload.content.strip()
    db.commit()
    db.refresh(r)
    return {"ok": True}

@router.get("/my/{tmdb_id}", response_model=ReviewOut)
def my_review(
    tmdb_id: int,
    media_type: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(Review).filter(
        Review.user_id == user.id,
        Review.tmdb_id == tmdb_id,
        Review.media_type == media_type,
        Review.parent_id == None,   # noqa
        Review.status == "VISIBLE",
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="No review yet")

    return row
