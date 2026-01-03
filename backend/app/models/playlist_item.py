# app/models/playlist_item.py
from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, UniqueConstraint, Index, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class PlaylistItem(Base):
    __tablename__ = "playlist_items"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False, index=True)

    tmdb_id = Column(Integer, nullable=False, index=True)
    media_type = Column(String(10), nullable=False)  # movie|tv
    title = Column(String(250), nullable=True)
    poster_path = Column(String(255), nullable=True)
    release_date = Column(String(20), nullable=True)
    first_air_date = Column(String(20), nullable=True)
    vote_average = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    playlist = relationship("Playlist", back_populates="items")

    __table_args__ = (
        UniqueConstraint("playlist_id", "tmdb_id", "media_type", name="uq_playlist_tmdb"),
        Index("ix_playlist_items_playlist_id_created_at", "playlist_id", "created_at"),
    )
