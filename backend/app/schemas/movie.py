from pydantic import BaseModel
from typing import Optional, List


class MovieOut(BaseModel):
    title: str
    movie_id: int
    genres: Optional[str] = None
    rating: Optional[float] = None
    overview: Optional[str] = None


class MovieCreate(BaseModel):
    title: str
    movie_id: Optional[int] = None
    genres: Optional[str] = None
    rating: Optional[float] = None
    overview: Optional[str] = None


class MovieUpdate(BaseModel):
    title: Optional[str] = None
    genres: Optional[str] = None
    rating: Optional[float] = None
    overview: Optional[str] = None


class AdminAnalytics(BaseModel):
    top_movies: List[dict]
    top_users: List[dict]
