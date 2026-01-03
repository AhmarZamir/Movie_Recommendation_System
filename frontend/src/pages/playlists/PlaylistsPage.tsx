import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { Plus, Lock, Globe, List, Pencil, Trash2 } from "lucide-react";
import type { PlaylistOut } from "../../types/playlist.types";

const PROTECTED_PLAYLISTS = new Set(["watchlist", "favorites"]);

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PlaylistOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get("/playlists/me", { params: { ensure_default: true } });
      setRows(res.data as PlaylistOut[]);
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to load playlists.");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setErr(null);
    const n = name.trim();
    if (!n) return setErr("Playlist name is required.");
    try {
      await http.post("/playlists", { name: n, is_public: isPublic });
      setName("");
      setIsPublic(false);
      await load();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to create playlist.");
    }
  }

  async function toggleVisibility(p: PlaylistOut) {
    if (PROTECTED_PLAYLISTS.has(p.name.toLowerCase())) return;
    setErr(null);
    try {
      await http.put(`/playlists/${p.id}`, { is_public: !p.is_public });
      setRows((prev) =>
        prev.map((row) => (row.id === p.id ? { ...row, is_public: !row.is_public } : row))
      );
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to update playlist.");
    }
  }

  async function deletePlaylist(p: PlaylistOut) {
    if (PROTECTED_PLAYLISTS.has(p.name.toLowerCase())) return;
    const ok = window.confirm(`Delete "${p.name}"? This cannot be undone.`);
    if (!ok) return;
    setErr(null);
    try {
      await http.delete(`/playlists/${p.id}`);
      setRows((prev) => prev.filter((row) => row.id !== p.id));
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to delete playlist.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">My List</h1>
            <div className="mt-1 text-xs text-white/55">Your playlists and saved movies/TV shows.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white/85">Create Playlist</div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekend Picks"
                className="h-9 w-[220px] rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 outline-none focus:border-purple-400/50"
              />
              <button
                onClick={create}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                Create
              </button>
            </div>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/30"
              />
              Public playlist
            </label>
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
              No playlists yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {rows.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/playlists/${p.id}`)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-base font-bold text-white/90">{p.name}</div>
                    {p.is_public ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                        <Globe className="h-4 w-4" /> Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-white/50">
                        <Lock className="h-4 w-4" /> Private
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm text-white/65">
                    <List className="h-4 w-4" />
                    {p.items_count} items
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(p);
                      }}
                      disabled={PROTECTED_PLAYLISTS.has(p.name.toLowerCase())}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" />
                      {p.is_public ? "Make Private" : "Make Public"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaylist(p);
                      }}
                      disabled={PROTECTED_PLAYLISTS.has(p.name.toLowerCase())}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
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
