import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Toast from "../Toast/Toast";
import { Plus, Check, Loader2 } from "lucide-react";
import type { MediaType } from "../../types/tmdb.types";
import type { PlaylistOut } from "../../types/playlist.types";

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

export default function AddToPlaylistButton({
  tmdbId,
  mediaType,
  variant = "full",
  className,
}: {
  tmdbId: number;
  mediaType: MediaType;
  variant?: "full" | "icon";
  className?: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PlaylistOut[]>([]);
  const [loading, setLoading] = useState(false); // loading playlists list
  const [addingId, setAddingId] = useState<number | null>(null); // adding to a playlist
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }

  async function loadPlaylists() {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get("/playlists/me", { params: { ensure_default: true } });
      setRows((res.data ?? []) as PlaylistOut[]);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else if (axios.isAxiosError(e)) setErr((e.response?.data as any)?.detail || "Failed to load playlists.");
      else setErr("Failed to load playlists.");
    } finally {
      setLoading(false);
    }
  }

  async function addTo(playlistId: number) {
    setErr(null);
    setAddingId(playlistId);
    try {
      await http.post(`/playlists/${playlistId}/items`, {
        tmdb_id: tmdbId,
        media_type: mediaType,
      });

      window.dispatchEvent(new CustomEvent("playlist-items-updated", { detail: { playlistId } }));

      const playlist = rows.find((p) => p.id === playlistId);
      showToast(`Added to ${playlist?.name ?? "playlist"}`);

      const seedKey = `recommendation_seed_${decodeUserIdFromToken() ?? "anon"}`;
      localStorage.setItem(
        seedKey,
        JSON.stringify({ kind: "playlist", tmdbId, mediaType, ts: Date.now() })
      );
      window.dispatchEvent(new Event("recommendation_seed_updated"));

      setOpen(false);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else if (axios.isAxiosError(e)) setErr((e.response?.data as any)?.detail || "Failed to add to playlist.");
      else setErr("Failed to add to playlist.");
    } finally {
      setAddingId(null);
    }
  }

  useEffect(() => {
    if (open) loadPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          className ??
          (variant === "icon"
            ? "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
            : "inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold")
        }
        title="My List"
      >
        <Plus className="h-4 w-4" />
        {variant === "full" ? "My List" : null}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-black/90 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.55)]">
          <div className="text-sm font-semibold text-white/90">Choose playlist</div>

          {err && <div className="mt-2 text-xs text-red-200">{err}</div>}

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {rows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={addingId === p.id}
                  onClick={() => addTo(p.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60"
                >
                  <span className="truncate">{p.name}</span>
                  {addingId === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 text-emerald-300" />
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate("/playlists")}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Manage playlists
          </button>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
