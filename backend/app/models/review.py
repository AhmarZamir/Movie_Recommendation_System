from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    tmdb_id = Column(Integer, nullable=False)
    media_type = Column(Integer, default=0)  # 0=movie, 1=tv

    parent_id = Column(Integer, ForeignKey("reviews.id"), nullable=True)  # replies

    content = Column(Text, nullable=False)
    status = Column(String(10), default="VISIBLE")  # VISIBLE/FLAGGED/REMOVED

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
