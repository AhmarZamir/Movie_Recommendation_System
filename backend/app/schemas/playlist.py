from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

MediaType = Literal["movie", "tv"]


class PlaylistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    is_public: bool = False


class PlaylistUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    is_public: Optional[bool] = None


class PlaylistItemAdd(BaseModel):
    tmdb_id: int
    media_type: MediaType


class PlaylistItemOut(BaseModel):
    id: int
    tmdb_id: int
    media_type: MediaType

    title: Optional[str] = None
    poster_path: Optional[str] = None
    release_date: Optional[str] = None
    first_air_date: Optional[str] = None
    vote_average: Optional[float] = None

    created_at: datetime

    class Config:
        from_attributes = True


class PlaylistOut(BaseModel):
    id: int
    name: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    items_count: int = 0

    class Config:
        from_attributes = True


class PlaylistDetailOut(BaseModel):
    id: int
    name: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    items: List[PlaylistItemOut]

    class Config:
        from_attributes = True


class PublicPlaylistOut(BaseModel):
    id: int
    name: str
    user_id: int
    user_name: Optional[str] = None
    items_count: int = 0
    updated_at: datetime

    class Config:
        from_attributes = True


class PublicPlaylistDetailOut(BaseModel):
    id: int
    name: str
    user_id: int
    user_name: Optional[str] = None
    items: List[PlaylistItemOut]

    class Config:
        from_attributes = True
