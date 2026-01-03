from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func
import httpx

from app.core.config import TMDB_API_KEY, TMDB_BASE_URL
from app.db.database import get_db
from app.models.playlist import Playlist
from app.models.playlist_item import PlaylistItem
from app.schemas.playlist import (
    PlaylistCreate, PlaylistUpdate, PlaylistOut, PlaylistDetailOut,
    PlaylistItemAdd, PublicPlaylistOut, PublicPlaylistDetailOut
)
from app.core.deps import get_current_user
from app.models.user import User
from typing import Literal

MediaType = Literal["movie", "tv"]

router = APIRouter(prefix="/playlists", tags=["playlists"])

DEFAULT_PLAYLIST_NAME = "Watchlist"
DEFAULT_FAVORITES_NAME = "Favorites"


async def tmdb_get(path: str, params: dict | None = None):
    if not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY missing")
    p = {"api_key": TMDB_API_KEY, "language": "en-US"}
    if params:
        p.update(params)

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{TMDB_BASE_URL}{path}", params=p)
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()


def ensure_default_playlists(db: Session, user_id: int) -> None:
    existing = (
        db.query(Playlist.name)
        .filter(
            Playlist.user_id == user_id,
            Playlist.name.in_([DEFAULT_PLAYLIST_NAME, DEFAULT_FAVORITES_NAME]),
        )
        .all()
    )
    names = {row.name for row in existing}
    to_create = []
    if DEFAULT_PLAYLIST_NAME not in names:
        to_create.append(Playlist(user_id=user_id, name=DEFAULT_PLAYLIST_NAME, is_public=False))
    if DEFAULT_FAVORITES_NAME not in names:
        to_create.append(Playlist(user_id=user_id, name=DEFAULT_FAVORITES_NAME, is_public=False))
    if not to_create:
        return
    db.add_all(to_create)
    db.commit()


@router.get("/me", response_model=list[PlaylistOut])
def my_playlists(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    ensure_default: bool = Query(True),
):
    if ensure_default:
        ensure_default_playlists(db, current_user.id)

    rows = (
        db.query(
            Playlist.id,
            Playlist.name,
            Playlist.is_public,
            Playlist.created_at,
            Playlist.updated_at,
            func.count(PlaylistItem.id).label("items_count"),
        )
        .outerjoin(PlaylistItem, PlaylistItem.playlist_id == Playlist.id)
        .filter(Playlist.user_id == current_user.id)
        .group_by(Playlist.id)
        .order_by(Playlist.created_at.desc())
        .all()
    )

    return [
        PlaylistOut(
            id=r.id,
            name=r.name,
            is_public=r.is_public,
            created_at=r.created_at,
            updated_at=r.updated_at,
            items_count=r.items_count,
        )
        for r in rows
    ]


@router.get("/public/contains", response_model=list[PublicPlaylistOut])
def public_playlists_for_item(
    tmdb_id: int,
    media_type: MediaType,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    count_sq = (
        db.query(
            PlaylistItem.playlist_id.label("playlist_id"),
            func.count(PlaylistItem.id).label("items_count"),
        )
        .group_by(PlaylistItem.playlist_id)
        .subquery()
    )

    contain_item = aliased(PlaylistItem)

    rows = (
        db.query(
            Playlist.id,
            Playlist.name,
            Playlist.user_id,
            Playlist.updated_at,
            User.name.label("user_name"),
            func.coalesce(count_sq.c.items_count, 0).label("items_count"),
        )
        .join(contain_item, contain_item.playlist_id == Playlist.id)
        .join(User, User.id == Playlist.user_id)
        .outerjoin(count_sq, count_sq.c.playlist_id == Playlist.id)
        .filter(
            Playlist.is_public == True,  # noqa
            contain_item.tmdb_id == tmdb_id,
            contain_item.media_type == media_type,
        )
        .group_by(Playlist.id, Playlist.updated_at, User.name, count_sq.c.items_count)
        .order_by(func.coalesce(count_sq.c.items_count, 0).desc(), Playlist.id.desc())
        .limit(limit)
        .all()
    )

    return [
        PublicPlaylistOut(
            id=r.id,
            name=r.name,
            user_id=r.user_id,
            user_name=r.user_name,
            items_count=int(r.items_count or 0),
            updated_at=r.updated_at,
        )
        for r in rows
    ]


@router.get("/public/{playlist_id}", response_model=PublicPlaylistDetailOut)
def public_playlist_detail(
    playlist_id: int,
    db: Session = Depends(get_db),
):
    pl = (
        db.query(Playlist, User.name.label("user_name"))
        .join(User, User.id == Playlist.user_id)
        .filter(Playlist.id == playlist_id, Playlist.is_public == True)  # noqa
        .first()
    )
    if not pl:
        raise HTTPException(status_code=404, detail="Public playlist not found")

    playlist, user_name = pl
    items = (
        db.query(PlaylistItem)
        .filter(PlaylistItem.playlist_id == playlist_id)
        .order_by(PlaylistItem.created_at.desc())
        .all()
    )

    return PublicPlaylistDetailOut(
        id=playlist.id,
        name=playlist.name,
        user_id=playlist.user_id,
        user_name=user_name,
        items=items,
    )


@router.post("", response_model=PlaylistOut)
def create_playlist(
    payload: PlaylistCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    exists = (
        db.query(Playlist)
        .filter(Playlist.user_id == current_user.id, Playlist.name == name)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Playlist name already exists")

    pl = Playlist(user_id=current_user.id, name=name, is_public=payload.is_public)
    db.add(pl)
    db.commit()
    db.refresh(pl)

    return PlaylistOut(
        id=pl.id,
        name=pl.name,
        is_public=pl.is_public,
        created_at=pl.created_at,
        updated_at=pl.updated_at,
        items_count=0,
    )


@router.get("/{playlist_id}", response_model=PlaylistDetailOut)
def get_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pl = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
        .first()
    )
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    items = (
        db.query(PlaylistItem)
        .filter(PlaylistItem.playlist_id == playlist_id)
        .order_by(PlaylistItem.created_at.desc())
        .all()
    )

    return PlaylistDetailOut(
        id=pl.id,
        name=pl.name,
        is_public=pl.is_public,
        created_at=pl.created_at,
        updated_at=pl.updated_at,
        items=items,
    )


@router.put("/{playlist_id}", response_model=PlaylistOut)
def update_playlist(
    playlist_id: int,
    payload: PlaylistUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pl = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
        .first()
    )
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")

        clash = (
            db.query(Playlist)
            .filter(Playlist.user_id == current_user.id, Playlist.name == name, Playlist.id != playlist_id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail="Playlist name already exists")

        pl.name = name

    if payload.is_public is not None:
        pl.is_public = payload.is_public

    db.commit()

    count = db.query(func.count(PlaylistItem.id)).filter(PlaylistItem.playlist_id == pl.id).scalar() or 0

    return PlaylistOut(
        id=pl.id,
        name=pl.name,
        is_public=pl.is_public,
        created_at=pl.created_at,
        updated_at=pl.updated_at,
        items_count=count,
    )


@router.delete("/{playlist_id}")
def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pl = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
        .first()
    )
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    if pl.name == DEFAULT_PLAYLIST_NAME:
        raise HTTPException(status_code=400, detail="Cannot delete default playlist")

    db.delete(pl)
    db.commit()
    return {"ok": True}


@router.post("/{playlist_id}/items")
async def add_item(
    playlist_id: int,
    payload: PlaylistItemAdd,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pl = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
        .first()
    )
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    exists = (
        db.query(PlaylistItem)
        .filter(
            PlaylistItem.playlist_id == playlist_id,
            PlaylistItem.tmdb_id == payload.tmdb_id,
            PlaylistItem.media_type == payload.media_type,
        )
        .first()
    )
    if exists:
        return {"ok": True, "already": True}

    if payload.media_type == "movie":
        details = await tmdb_get(f"/movie/{payload.tmdb_id}")
        title = details.get("title")
        poster_path = details.get("poster_path")
        release_date = details.get("release_date")
        first_air_date = None
        vote_average = float(details.get("vote_average") or 0) or None
    else:
        details = await tmdb_get(f"/tv/{payload.tmdb_id}")
        title = details.get("name")
        poster_path = details.get("poster_path")
        first_air_date = details.get("first_air_date")
        release_date = None
        vote_average = float(details.get("vote_average") or 0) or None

    item = PlaylistItem(
        playlist_id=playlist_id,
        tmdb_id=payload.tmdb_id,
        media_type=payload.media_type,
        title=title,
        poster_path=poster_path,
        release_date=release_date,
        first_air_date=first_air_date,
        vote_average=vote_average,
    )
    db.add(item)
    db.commit()
    return {"ok": True, "item_id": item.id}

@router.delete("/{playlist_id}/items")
def remove_item(
    playlist_id: int,
    tmdb_id: int = Query(...),
    media_type: MediaType = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    pl = (
        db.query(Playlist)
        .filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id)
        .first()
    )
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist not found")

    item = (
        db.query(PlaylistItem)
        .filter(
            PlaylistItem.playlist_id == playlist_id,
            PlaylistItem.tmdb_id == tmdb_id,
            PlaylistItem.media_type == media_type,
        )
        .first()
    )
    if not item:
        return {"ok": True, "removed": False}

    db.delete(item)
    db.commit()
    return {"ok": True, "removed": True}
