import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { Trash2, Star } from "lucide-react";
import type { PlaylistDetail } from "../../types/playlist.types";
import type { MediaType } from "../../types/tmdb.types";

function tmdbImg(path: string | null | undefined, size: "w342" | "w500" = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

function getYear(d?: string | null) {
  if (!d) return "";
  const y = new Date(d).getFullYear();
  return Number.isFinite(y) ? String(y) : "";
}

export default function PlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const playlistIdNum = Number(playlistId);
  const navigate = useNavigate();

  const [data, setData] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get(`/playlists/${playlistIdNum}`);
      setData(res.data as PlaylistDetail);
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to load playlist.");
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(tmdb_id: number, media_type: MediaType) {
    setErr(null);
    try {
      await http.delete(`/playlists/${playlistIdNum}/items`, { params: { tmdb_id, media_type } });
      await load();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to remove item.");
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
            <button onClick={() => navigate("/playlists")} className="text-sm text-white/60 hover:text-white">
              ← Back to My List
            </button>
            <h1 className="mt-2 text-2xl font-extrabold">{data?.name ?? "Playlist"}</h1>
            <div className="mt-1 text-xs text-white/55">{data?.items?.length ?? 0} items</div>
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
              No items yet. Add something from a Movie/TV detail page.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data!.items.map((m) => {
                const title = m.title || "(Untitled)";
                const year = getYear(m.media_type === "tv" ? m.first_air_date : m.release_date);
                const poster = tmdbImg(m.poster_path, "w342");
                const rating = m.vote_average ? Number(m.vote_average) : 0;

                return (
                  <div
                    key={m.id}
                    className="group relative rounded-2xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(m.media_type === "tv" ? `/tv/${m.tmdb_id}` : `/movie/${m.tmdb_id}`)}
                      className="w-full text-left"
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

                    <button
                      type="button"
                      onClick={() => removeItem(m.tmdb_id, m.media_type)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
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
