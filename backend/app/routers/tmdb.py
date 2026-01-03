# app/routers/tmdb.py
from fastapi import APIRouter, HTTPException
from typing import Literal, Optional
import httpx

from app.core.config import TMDB_API_KEY, TMDB_BASE_URL

router = APIRouter(prefix="/tmdb", tags=["tmdb"])

MediaType = Literal["movie", "tv"]

def norm_type(t: str | None) -> MediaType:
    tt = (t or "movie").lower().strip()
    if tt not in ("movie", "tv"):
        raise HTTPException(status_code=400, detail="type must be movie|tv")
    return tt

async def tmdb_get(path: str, params: dict | None = None):
    if not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDB_API_KEY missing")

    p = {"api_key": TMDB_API_KEY, "language": "en-US"}
    if params:
        p.update({k: v for k, v in params.items() if v is not None})

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{TMDB_BASE_URL}{path}", params=p)
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()

@router.get("/trending")
async def trending(type: str = "movie"):
    t = norm_type(type)
    return await tmdb_get(f"/trending/{t}/week")


@router.get("/now_playing")
async def now_playing(type: str = "movie", page: int = 1):
    t = norm_type(type)
    if t == "movie":
        return await tmdb_get("/movie/now_playing", params={"page": page})
    return await tmdb_get("/tv/on_the_air", params={"page": page})


@router.get("/genre/list")
async def genre_list(type: str = "movie"):
    t = norm_type(type)
    return await tmdb_get(f"/genre/{t}/list")

@router.get("/search")
async def search(type: str = "movie", query: str = "", page: int = 1):
    """
    NOTE:
    TMDB /search does NOT support filters like vote_average_gte, year range, with_genres reliably.
    Do filtering client-side for search results, or use /discover (no text query).
    """
    t = norm_type(type)
    if not query.strip():
        raise HTTPException(status_code=400, detail="query is required")
    return await tmdb_get(f"/search/{t}", params={"query": query, "page": page, "include_adult": "false"})


@router.get("/discover")
async def discover(
    type: str = "movie",
    page: int = 1,
    with_genres: Optional[str] = None,       
    vote_average_gte: Optional[float] = None,   # min rating (0..10)
    year_from: Optional[int] = None,          
    year_to: Optional[int] = None,
    primary_release_date_gte: Optional[str] = None,  # YYYY-MM-DD (movie)
    primary_release_date_lte: Optional[str] = None,
    first_air_date_gte: Optional[str] = None,        # YYYY-MM-DD (tv)
    first_air_date_lte: Optional[str] = None,
    sort_by: Optional[str] = None,          \
):
    t = norm_type(type)

    params: dict = {
        "page": page,
        "with_genres": with_genres,
        "vote_average.gte": vote_average_gte,
        "sort_by": sort_by,
        "include_adult": "false",
    }

    if t == "movie":
        if year_from is not None:
            params["primary_release_date.gte"] = f"{year_from}-01-01"
        if year_to is not None:
            params["primary_release_date.lte"] = f"{year_to}-12-31"

        if primary_release_date_gte:
            params["primary_release_date.gte"] = primary_release_date_gte
        if primary_release_date_lte:
            params["primary_release_date.lte"] = primary_release_date_lte

        return await tmdb_get("/discover/movie", params=params)

    if year_from is not None:
        params["first_air_date.gte"] = f"{year_from}-01-01"
    if year_to is not None:
        params["first_air_date.lte"] = f"{year_to}-12-31"

    if primary_release_date_gte and not first_air_date_gte:
        params["first_air_date.gte"] = primary_release_date_gte
    if primary_release_date_lte and not first_air_date_lte:
        params["first_air_date.lte"] = primary_release_date_lte

    if first_air_date_gte:
        params["first_air_date.gte"] = first_air_date_gte
    if first_air_date_lte:
        params["first_air_date.lte"] = first_air_date_lte

    return await tmdb_get("/discover/tv", params=params)


@router.get("/details/{tmdb_id}")
async def details(tmdb_id: int, type: str = "movie"):
    t = norm_type(type)
    return await tmdb_get(f"/{t}/{tmdb_id}", params={"append_to_response": "credits,keywords"})


@router.get("/videos/{tmdb_id}")
async def videos(tmdb_id: int, type: str = "movie"):
    t = norm_type(type)
    return await tmdb_get(f"/{t}/{tmdb_id}/videos")


@router.get("/movie/{tmdb_id}")
async def movie_details(tmdb_id: int):
    return await tmdb_get(f"/movie/{tmdb_id}", params={"append_to_response": "credits,keywords"})


@router.get("/movie/{tmdb_id}/videos")
async def movie_videos(tmdb_id: int):
    return await tmdb_get(f"/movie/{tmdb_id}/videos")


@router.get("/person/{tmdb_id}")
async def person_details(tmdb_id: int):
    return await tmdb_get(f"/person/{tmdb_id}")
