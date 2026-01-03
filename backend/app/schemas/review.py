# app/schemas/review.py
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional

class ReviewCreate(BaseModel):
    tmdb_id: int
    media_type: int = Field(default=0, ge=0, le=1)
    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: Optional[int] = None

class ReviewVoteIn(BaseModel):
    value: int = Field(..., description="+1 upvote, -1 downvote")

class ReviewOut(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    tmdb_id: int
    media_type: int
    parent_id: Optional[int] = None
    content: str
    status: str

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    upvotes: int = 0
    downvotes: int = 0
    user_score: int = 0 

    class Config:
        from_attributes = True

class ReviewModerate(BaseModel):
    status: str  # VISIBLE | FLAGGED | REMOVED
    
class ReviewUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
