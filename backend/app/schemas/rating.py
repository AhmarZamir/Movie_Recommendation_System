from pydantic import BaseModel, Field

class RatingUpsert(BaseModel):
    tmdb_id: int
    media_type: int = Field(default=0, ge=0, le=1)
    score: int = Field(..., ge=1, le=5)

class RatingOut(BaseModel):
    tmdb_id: int
    media_type: int
    score: int

class RatingAggregate(BaseModel):
    tmdb_id: int
    media_type: int
    avg_score: float
    count: int

class RatingBreakdown(BaseModel):
    tmdb_id: int
    media_type: int
    avg_score: float
    count: int
    breakdown: dict[int, int]
