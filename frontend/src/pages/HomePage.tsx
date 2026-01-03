import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import axios from "axios";
import Navbar from "../components/Navbar";
import HeroBanner from "../components/HeroBanner/HeroBanner";
import MovieRow from "../components/MovieRow/MovieRow";
import ChipRow from "../components/ChipRow/ChipRow";
import GenreRow from "../components/GenreRow/GenreRow";
import Footer from "../components/Footer";
import AddToPlaylistButton from "../components/Playlists/AddToPlaylistButton";

import { getTrendingMovies, getNowPlayingMovies, getGenres } from "../services/tmdb.service";
import type { PlaylistOut } from "../types/playlist.types";

function decodeUserIdFromToken(): number | null {
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    const raw = payload.user_id ?? payload.id ?? payload.sub;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function getRecentSearchKey() {
  return `recent_searches_${decodeUserIdFromToken() ?? "anon"}`;
}

function getRecommendationSeedKey() {
  return `recommendation_seed_${decodeUserIdFromToken() ?? "anon"}`;
}

function getRecommendationCacheKey() {
  return `recommendation_cache_${decodeUserIdFromToken() ?? "anon"}`;
}

type RecSeed =
  | { kind: "playlist"; tmdbId: number; mediaType: "movie" | "tv"; ts: number }
  | { kind: "search"; term: string; ts: number };

export default function HomePage() {
  const [trending, setTrending] = useState<any[]>([]);
  const [justAdded, setJustAdded] = useState<any[]>([]);
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(
    () => JSON.parse(localStorage.getItem(getRecentSearchKey()) || "[]")
  );

  const navigate = useNavigate();

  const [myPlaylists, setMyPlaylists] = useState<PlaylistOut[] | null>(null);
  const [recItems, setRecItems] = useState<any[]>([]);
  const [recLabel, setRecLabel] = useState<string | null>(null);
  const [recType, setRecType] = useState<"movie" | "tv">("movie");
  const [recIndex, setRecIndex] = useState(0);
  const [seedVersion, setSeedVersion] = useState(0);

  const goMyList = () => {
    if (!localStorage.getItem("access_token")) return navigate("/auth/login");
    navigate("/playlists");
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!localStorage.getItem("access_token")) {
        setMyPlaylists(null);
        return;
      }

      try {
        const res = await http.get("/playlists/me", { params: { ensure_default: true } });
        if (!mounted) return;
        setMyPlaylists((res.data ?? []) as PlaylistOut[]);
      } catch (e) {
        if (!mounted) return;
        setMyPlaylists([]);
        if (axios.isAxiosError(e)) console.log(e.response?.data);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);


  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [t, np, g] = await Promise.all([
          getTrendingMovies(),
          getNowPlayingMovies(),
          getGenres(),
        ]);

        setTrending(t.results ?? []);
        setJustAdded(np.results ?? []);
        setGenres(g.genres ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load home data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const read = () => {
      setRecentSearches(JSON.parse(localStorage.getItem(getRecentSearchKey()) || "[]"));
      setSeedVersion((v) => v + 1);
    };

    window.addEventListener("storage", read);
    window.addEventListener("focus", read);

    window.addEventListener("recent_searches_updated" as any, read);
    window.addEventListener("auth-changed", read);
    window.addEventListener("recommendation_seed_updated" as any, read);

    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("focus", read);
      window.removeEventListener("recent_searches_updated" as any, read);
      window.removeEventListener("auth-changed", read);
      window.removeEventListener("recommendation_seed_updated" as any, read);
    };
  }, []);

  useEffect(() => {
    let timer: number | null = null;
    if (recItems.length > 1) {
      timer = window.setInterval(() => {
        setRecIndex((idx) => (idx + 1) % recItems.length);
      }, 4500);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [recItems]);

  useEffect(() => {
    let mounted = true;

    async function loadRecommendations() {
      const cacheRaw = localStorage.getItem(getRecommendationCacheKey());
      if (cacheRaw) {
        try {
          const cache = JSON.parse(cacheRaw) as {
            seed: RecSeed;
            items: any[];
            label: string | null;
            type: "movie" | "tv";
            ts: number;
          };
          const fresh = Date.now() - cache.ts < 1000 * 60 * 60 * 6;
          if (fresh && cache.items?.length) {
            setRecItems(cache.items);
            setRecLabel(cache.label ?? null);
            setRecType(cache.type ?? "movie");
            setRecIndex(0);
            return;
          }
        } catch {
          // ignore cache parse errors
        }
      }

      const seedRaw = localStorage.getItem(getRecommendationSeedKey());
      let seed: RecSeed | null = null;
      if (seedRaw) {
        try {
          seed = JSON.parse(seedRaw) as RecSeed;
        } catch {
          seed = null;
        }
      }

      if (!seed && recentSearches.length > 0) {
        seed = { kind: "search", term: recentSearches[0], ts: Date.now() };
        localStorage.setItem(getRecommendationSeedKey(), JSON.stringify(seed));
      }

      if (!seed) {
        if (mounted) {
          setRecItems([]);
          setRecLabel(null);
          setRecIndex(0);
        }
        return;
      }

      try {
        if (seed.kind === "playlist") {
          setRecType(seed.mediaType);
          const details = await http.get(`/tmdb/details/${seed.tmdbId}`, {
            params: { type: seed.mediaType },
          });
          if (!mounted) return;
          const title = details.data?.title ?? details.data?.name ?? "this title";
          const genres = details.data?.genres?.map((g: any) => g.id).slice(0, 2).join(",");
          const rating = Number(details.data?.vote_average ?? 0);
          const res = await http.get("/tmdb/discover", {
            params: {
              type: seed.mediaType,
              with_genres: genres || undefined,
              vote_average_gte: rating ? Math.max(0, rating - 1.5) : undefined,
              sort_by: "popularity.desc",
              page: 1,
            },
          });
          if (!mounted) return;
          const list = (res.data?.results ?? [])
            .filter((item: any) => item.id !== seed.tmdbId)
            .slice(0, 5);
          const label = `Because you liked ${title}`;
          setRecItems(list);
          setRecLabel(label);
          setRecIndex(0);
          localStorage.setItem(
            getRecommendationCacheKey(),
            JSON.stringify({
              seed,
              items: list,
              label,
              type: seed.mediaType,
              ts: Date.now(),
            })
          );
          return;
        }

        if (seed.kind === "search") {
          const term = seed.term;
          let searchType: "movie" | "tv" = "movie";
          let searchRes = await http.get("/tmdb/search", {
            params: { query: term, type: "movie", page: 1 },
          });
          let searchList = searchRes.data?.results ?? [];
          if (!searchList.length) {
            searchType = "tv";
            searchRes = await http.get("/tmdb/search", {
              params: { query: term, type: "tv", page: 1 },
            });
            searchList = searchRes.data?.results ?? [];
          }

          if (!searchList.length) {
            setRecItems([]);
            setRecLabel(`Because you searched ${term}`);
            setRecIndex(0);
            setRecType(searchType);
            return;
          }

          const seedItem = searchList[0];
          setRecType(searchType);
          const details = await http.get(`/tmdb/details/${seedItem.id}`, {
            params: { type: searchType },
          });
          if (!mounted) return;
          const genres = details.data?.genres?.map((g: any) => g.id).slice(0, 2).join(",");
          const rating = Number(details.data?.vote_average ?? 0);
          const res = await http.get("/tmdb/discover", {
            params: {
              type: searchType,
              with_genres: genres || undefined,
              vote_average_gte: rating ? Math.max(0, rating - 1.5) : undefined,
              sort_by: "popularity.desc",
              page: 1,
            },
          });
          if (!mounted) return;
          const list = (res.data?.results ?? [])
            .filter((item: any) => item.id !== seedItem.id)
            .slice(0, 5);
          const label = `Because you searched ${term}`;
          setRecItems(list);
          setRecLabel(label);
          setRecIndex(0);
          localStorage.setItem(
            getRecommendationCacheKey(),
            JSON.stringify({
              seed,
              items: list,
              label,
              type: searchType,
              ts: Date.now(),
            })
          );
        }
      } catch {
        if (!mounted) return;
        setRecItems([]);
        setRecLabel(null);
        setRecIndex(0);
      }
    }

    loadRecommendations();

    return () => {
      mounted = false;
    };
  }, [seedVersion, recentSearches]);

  const genreMap = useMemo(() => {
    const m = new Map<number, string>();
    genres.forEach((x) => m.set(x.id, x.name));
    return m;
  }, [genres]);

  const featured = trending[0];
  const featuredTitle = featured?.title ?? featured?.name ?? "Featured Movie";
  const featuredOverview = featured?.overview ?? "";
  const featuredBackdrop = featured?.backdrop_path ?? null;
  const featuredRating = featured?.vote_average;

  const metaLine = featured?.genre_ids
    ? featured.genre_ids
        .slice(0, 2)
        .map((id: number) => genreMap.get(id))
        .filter(Boolean)
        .join(", ")
    : "";

  const recommended = recItems[recIndex];
  const recTitle = recommended?.title ?? recommended?.name ?? "Recommended";
  const recBackdrop = recommended?.backdrop_path
    ? `https://image.tmdb.org/t/p/original${recommended.backdrop_path}`
    : "";
  const recPoster = recommended?.poster_path
    ? `https://image.tmdb.org/t/p/w342${recommended.poster_path}`
    : "";
  const recOverview = recommended?.overview ?? "";
  const recMediaType = recType;
  const recGenreLine = recommended?.genre_ids
    ? recommended.genre_ids
        .slice(0, 2)
        .map((id: number) => genreMap.get(id))
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="min-h-screen">
      <Navbar />

      {loading && (
        <div className="mx-auto max-w-6xl px-6 pt-8 text-white/80">Loading…</div>
      )}
      {err && <div className="mx-auto max-w-6xl px-6 pt-8 text-red-300">{err}</div>}

      {!loading && !err && featured && (
        <>
          <HeroBanner
            title={featuredTitle}
            overview={featuredOverview}
            backdropPath={featuredBackdrop}
            rating={featuredRating}
            metaLine={metaLine}
            onClick={() => navigate(`/movie/${featured.id}`)}
            onPrimary={() => navigate(`/movie/${featured.id}`)}
            onSecondary={() => navigate(`/playlists`)}
            playlistPicker={{ tmdbId: featured.id, mediaType: "movie" }}
          />

          <ChipRow
            title="Recently Searched"
            chips={recentSearches}
            rightText="Clear History"
            onRightClick={() => {
              localStorage.removeItem(getRecentSearchKey());
              setRecentSearches([]);
            }}
            onChipClick={(c) => navigate(`/browse?q=${encodeURIComponent(c)}`)}
          />

          {/* TRENDING */}
          <MovieRow
            title="Trending Now"
            movies={trending}
            rightText="View All"
            onRightClick={() => navigate("/browse")}
            onMovieClick={(id) => navigate(`/movie/${id}`)}
          />

          {/* RECOMMENDED FOR YOU */}
          {recommended && (
            <section className="mx-auto mt-10 max-w-6xl px-6">
              <div className="mb-3">
                <h2 className="text-lg font-bold">Recommended for You</h2>
                <div className="text-xs text-white/50">{recLabel ?? "Based on your activity"}</div>
              </div>

              <div
                className="relative cursor-pointer rounded-3xl border border-white/10 bg-white/5"
                onClick={() => navigate(`/${recMediaType}/${recommended.id}`)}
              >
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  {recBackdrop && (
                    <img
                      src={recBackdrop}
                      alt={recTitle}
                      className="absolute inset-0 h-full w-full object-cover opacity-35"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
                </div>

                <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-8">
                  {recPoster && (
                    <img
                      src={recPoster}
                      alt={recTitle}
                      className="h-[140px] w-[110px] rounded-2xl object-cover shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-fuchsia-500/20 px-2 py-1 font-semibold text-fuchsia-200">
                        Top 5
                      </span>
                      {recGenreLine && (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                          {recGenreLine}
                        </span>
                      )}
                    </div>

                    <div className="text-2xl font-extrabold">{recTitle}</div>
                    <p className="mt-2 max-w-2xl text-sm text-white/70 line-clamp-3">
                      {recOverview}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/${recMediaType}/${recommended.id}`);
                        }}
                        className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold"
                      >
                        Watch Now
                      </button>
                      <AddToPlaylistButton
                        tmdbId={recommended.id}
                        mediaType={recMediaType}
                        variant="full"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* YOUR PLAYLISTS */}
          <section className="mx-auto mt-10 max-w-6xl px-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Your Playlists</h2>
              <button
                onClick={goMyList}
                className="text-sm text-purple-300 hover:text-purple-200"
              >
                Manage
              </button>
            </div>

            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-3">
              {(myPlaylists && myPlaylists.length > 0 ? myPlaylists.slice(0, 6) : []).map((p, idx) => {
                const tone =
                  idx === 1 ? "bg-fuchsia-500/30" : "bg-white/5";

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (!localStorage.getItem("access_token")) return navigate("/auth/login");
                      navigate(`/playlists/${p.id}`);
                    }}
                    className={`group w-[220px] flex-shrink-0 rounded-2xl border border-white/10 ${tone} p-4 text-left
                                transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10
                                focus:outline-none focus:ring-2 focus:ring-purple-400/40`}
                  >
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {p.items_count} {p.items_count === 1 ? "Movie" : "Movies"}
                    </div>
                  </button>
                );
              })}

              {(!localStorage.getItem("access_token") || (myPlaylists && myPlaylists.length === 0)) && (
                <>
                  <button
                    type="button"
                    onClick={goMyList}
                    className="w-[220px] flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4 text-left
                              transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="text-sm font-semibold">Watchlist</div>
                    <div className="mt-1 text-xs text-white/60">Open My List</div>
                  </button>
                </>
              )}

              <button
                onClick={goMyList}
                className="w-[220px] flex-shrink-0 rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                <div className="text-sm font-semibold">＋ New</div>
                <div className="mt-1 text-xs text-white/60">Create playlist</div>
              </button>
            </div>
          </section>

          {/* GENRES */}
          <GenreRow
            genres={genres}
            onGenreClick={(g) => navigate(`/browse?q=${encodeURIComponent(g.name)}`)}
          />

          {/* JUST ADDED */}
          <MovieRow
            title="Just Added"
            movies={justAdded}
            rightText="View All"
            onRightClick={() => navigate("/browse")}
            onMovieClick={(id) => navigate(`/movie/${id}`)}
          />

          <Footer />
        </>
      )}
    </div>
  );
}
