import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { Star } from "lucide-react";
import type { PublicPlaylistDetail } from "../../types/playlist.types";

function tmdbImg(path: string | null | undefined, size: "w342" | "w500" = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

function getYear(d?: string | null) {
  if (!d) return "";
  const y = new Date(d).getFullYear();
  return Number.isFinite(y) ? String(y) : "";
}

export default function PublicPlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const playlistIdNum = Number(playlistId);
  const navigate = useNavigate();

  const [data, setData] = useState<PublicPlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get(`/playlists/public/${playlistIdNum}`);
      setData(res.data as PublicPlaylistDetail);
    } catch (e: any) {
      if (axios.isAxiosError(e)) setErr((e.response?.data as any)?.detail || "Failed to load playlist.");
      else setErr(e?.message ?? "Failed to load playlist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(playlistIdNum)) {
      setLoading(false);
      setErr("Invalid playlist id");
      return;
    }
    load();
  }, [playlistIdNum]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => navigate(-1)} className="text-sm text-white/60 hover:text-white">
              ← Back
            </button>
            <h1 className="mt-2 text-2xl font-extrabold">{data?.name ?? "Public Playlist"}</h1>
            <div className="mt-1 text-xs text-white/55">
              by {data?.user_name ?? (data ? `User #${data.user_id}` : "Unknown")}
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              Loading...
            </div>
          ) : (data?.items?.length ?? 0) === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              No items in this playlist.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data!.items.map((m) => {
                const title = m.title || "(Untitled)";
                const year = getYear(m.media_type === "tv" ? m.first_air_date : m.release_date);
                const poster = tmdbImg(m.poster_path, "w342");
                const rating = m.vote_average ? Number(m.vote_average) : 0;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate(m.media_type === "tv" ? `/tv/${m.tmdb_id}` : `/movie/${m.tmdb_id}`)}
                    className="group relative rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
                  >
                    <div className="relative overflow-hidden rounded-xl">
                      <div className="aspect-[2/3] w-full bg-white/10">
                        {poster ? (
                          <img src={poster} alt={title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-white/40">No Poster</div>
                        )}
                      </div>

                      <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white/90">
                        <Star className="h-3.5 w-3.5 text-yellow-300" />
                        <span className="font-semibold">{rating ? rating.toFixed(1) : "—"}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="line-clamp-1 text-sm font-bold text-white/90">{title}</div>
                      <div className="mt-1 text-xs text-white/60">
                        {year || "—"} • {m.media_type.toUpperCase()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
