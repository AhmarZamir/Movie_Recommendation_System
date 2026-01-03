import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import type { PublicPlaylistOut } from "../../types/playlist.types";
import type { MediaType } from "../../types/tmdb.types";

function formatUpdatedAt(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
    : "Unknown";
}

export default function PublicPlaylistsListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tmdbId = Number(searchParams.get("tmdb_id"));
  const mediaType = (searchParams.get("media_type") || "movie") as MediaType;

  const [rows, setRows] = useState<PublicPlaylistOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get("/playlists/public/contains", {
        params: { tmdb_id: tmdbId, media_type: mediaType },
      });
      setRows((res.data ?? []) as PublicPlaylistOut[]);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) setErr((e.response?.data as any)?.detail || "Failed to load public playlists.");
      else setErr("Failed to load public playlists.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(tmdbId)) {
      setLoading(false);
      setErr("Invalid media id");
      return;
    }
    load();
  }, [tmdbId, mediaType]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => navigate(-1)} className="text-sm text-white/60 hover:text-white">
              Back
            </button>
            <h1 className="mt-2 text-2xl font-extrabold">Public Playlists</h1>
            <div className="mt-1 text-xs text-white/55">
              Playlists that include this {mediaType === "movie" ? "movie" : "TV show"}
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
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              No public playlists found.
            </div>
          ) : (
            <div className="grid gap-4">
              {rows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/public-playlists/${p.id}`)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10"
                >
                  <div className="text-base font-bold text-white/90">{p.name}</div>
                  <div className="mt-2 text-xs text-white/60">
                    Created by {p.user_name ?? `User #${p.user_id}`}
                  </div>
                  <div className="mt-1 text-xs text-white/60">Last updated {formatUpdatedAt(p.updated_at)}</div>
                  <div className="mt-3 text-sm text-white/70">{p.items_count} items</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
