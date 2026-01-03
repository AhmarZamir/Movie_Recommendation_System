import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import MovieRow from "../../components/MovieRow/MovieRow";
import CastRow from "../../components/MovieDetail/CastRow";
import MovieFactsCard from "../../components/MovieDetail/MovieFactsCard";
import ReviewsSection from "../../components/Reviews/ReviewsSection";
import MovieDetailBanner from "../../components/MovieDetail/MovieDetailBanner";
import Toast from "../../components/Toast/Toast";

import type { MediaType, TMDBListItem, TMDBMedia } from "../../types/tmdb.types";

export default function MediaDetailsPage({ mediaType }: { mediaType: MediaType }) {
  const { mediaId } = useParams<{ mediaId: string }>();
  const tmdbId = Number(mediaId);
  const navigate = useNavigate();

  const [media, setMedia] = useState<TMDBMedia | null>(null);
  const [director, setDirector] = useState<string | undefined>(undefined);
  const [cast, setCast] = useState<any[]>([]);
  const [alsoLike, setAlsoLike] = useState<TMDBListItem[]>([]);
  const [avgScore, setAvgScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const res = await http.get(`/tmdb/details/${tmdbId}`, { params: { type: mediaType } });
        const m = res.data as TMDBMedia;

        const crew = m.credits?.crew ?? [];
        const dir = mediaType === "movie"
          ? crew.find((x: any) => x.job === "Director")?.name
          : m.created_by?.[0]?.name ?? crew.find((x: any) => x.job === "Director")?.name;

        const castList = (m.credits?.cast ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          character: p.character,
          profile_path: p.profile_path,
        }));

        const t = await http.get(`/tmdb/trending`, { params: { type: mediaType } });
        const trending = (t.data?.results ?? []).filter((x: any) => x.id !== tmdbId).slice(0, 12);

        const ratingRes = await http.get(`/ratings/${tmdbId}`, {
          params: { media_type: mediaType === "tv" ? 1 : 0 },
        });
        const avg = Number(ratingRes.data?.avg_score ?? 0);
        const avg5 = avg > 5 ? avg / 2 : avg;

        if (!mounted) return;
        setMedia(m);
        setDirector(dir);
        setCast(castList);
        setAlsoLike(trending);
        setAvgScore(avg5);
      } catch (e: any) {
        if (!mounted) return;
        if (axios.isAxiosError(e)) {
          setErr((e.response?.data as any)?.detail || "Failed to load detail.");
        } else setErr(e?.message ?? "Failed to load detail.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      setErr(`Invalid ${mediaType} id`);
      setLoading(false);
      return;
    }

    load();
    return () => {
      mounted = false;
    };
  }, [tmdbId, mediaType]);

  function onWatchTrailer() {
    const title = media?.title ?? media?.name ?? "title";
    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(title)} trailer`,
      "_blank"
    );
  }

  async function onAddFavorite() {
    setActionErr(null);
    if (!localStorage.getItem("access_token")) return navigate("/auth/login");

    try {
      const res = await http.get(`/playlists/me`, { params: { ensure_default: true } });
      const rows = (res.data ?? []) as { id: number; name?: string }[];
      const fav = rows.find((p) => (p.name ?? "").toLowerCase() === "favorites");
      if (!fav) {
        setActionErr("Favorites playlist not found.");
        return;
      }
      await http.post(`/playlists/${fav.id}/items`, { tmdb_id: tmdbId, media_type: mediaType });
      setToast("Added to Favorites");
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setActionErr((e.response?.data as any)?.detail || "Failed to add to favorites.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10 text-white/70">Loading...</div>
        <Footer />
      </div>
    );
  }

  if (!media || err) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="text-xl font-extrabold">Detail</div>
          <div className="mt-2 text-white/70">{err ?? "Not found"}</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_520px_at_20%_10%,rgba(168,85,247,0.28),transparent_60%),radial-gradient(700px_480px_at_80%_15%,rgba(236,72,153,0.18),transparent_60%),linear-gradient(to_bottom,rgba(0,0,0,0.92),rgba(0,0,0,1))] text-white">
      <Navbar />
      <MovieDetailBanner
        tmdbId={tmdbId}
        mediaType={mediaType}
        title={media.title ?? media.name ?? "Untitled"}
        tagline={media.tagline ?? ""}
        backdropPath={media.backdrop_path}
        posterPath={media.poster_path}
        releaseDate={mediaType === "tv" ? media.first_air_date : media.release_date}
        runtime={mediaType === "tv" ? media.episode_run_time?.[0] : media.runtime}
        genres={media.genres}
        movieRating10={media.vote_average ?? 0}
        movieVotes={media.vote_count ?? 0}
        userScore5={avgScore}
        onPrimary={onWatchTrailer}
        onFavorite={onAddFavorite}
      />

      {actionErr && (
        <div className="mx-auto mt-4 max-w-6xl px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionErr}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <section className="mx-auto mt-7 max-w-6xl px-6">
        <p className="text-sm leading-7 text-white/70">{media.overview}</p>

        <div className="mt-6">
          <MovieFactsCard
            releaseDate={mediaType === "tv" ? media.first_air_date : media.release_date}
            runtime={mediaType === "tv" ? media.episode_run_time?.[0] : media.runtime}
            status={media.status}
            language={media.original_language}
            genres={media.genres}
            director={director}
          />
        </div>

        <div className="mt-8">
          <CastRow cast={cast} />
        </div>
      </section>

      <ReviewsSection tmdbId={tmdbId} mediaType={mediaType === "tv" ? 1 : 0} />

      <MovieRow
        title="You Might Also Like"
        movies={alsoLike}
        onMovieClick={(id) => navigate(mediaType === "tv" ? `/tv/${id}` : `/movie/${id}`)}
        rightText="View All"
        onRightClick={() => navigate(`/browse?type=${mediaType}`)}
      />

      <Footer />
    </div>
  );
}
