import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import type { AdminMovieOut } from "../../types/admin.types";

export default function ManageMoviesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminMovieOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [movieId, setMovieId] = useState("");
  const [genres, setGenres] = useState("");
  const [rating, setRating] = useState("");
  const [overview, setOverview] = useState("");

  const [selectedId, setSelectedId] = useState<string>("");

  const selectedMovie = useMemo(
    () => rows.find((m) => String(m.movie_id) === selectedId) ?? null,
    [rows, selectedId]
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get("/admin/movies");
      setRows((res.data ?? []) as AdminMovieOut[]);
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to load movies.");
    } finally {
      setLoading(false);
    }
  }

  async function createMovie() {
    setErr(null);
    if (!title.trim()) return setErr("Title is required.");
    try {
      const payload: any = {
        title: title.trim(),
        genres: genres.trim() || undefined,
        rating: rating.trim() ? Number(rating) : undefined,
        overview: overview.trim() || undefined,
      };
      if (movieId.trim()) payload.movie_id = Number(movieId);
      await http.post("/admin/movies", payload);
      setTitle("");
      setMovieId("");
      setGenres("");
      setRating("");
      setOverview("");
      await load();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to create movie.");
    }
  }

  async function updateMovie() {
    if (!selectedMovie) return;
    setErr(null);
    try {
      await http.put(`/admin/movies/${selectedMovie.movie_id}`, {
        title: title.trim() || selectedMovie.title,
        genres: genres.trim() || selectedMovie.genres,
        rating: rating.trim() ? Number(rating) : selectedMovie.rating,
        overview: overview.trim() || selectedMovie.overview,
      });
      await load();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to update movie.");
    }
  }

  async function deleteMovie() {
    if (!selectedMovie) return;
    const ok = window.confirm(`Delete "${selectedMovie.title}"?`);
    if (!ok) return;
    setErr(null);
    try {
      await http.delete(`/admin/movies/${selectedMovie.movie_id}`);
      setSelectedId("");
      await load();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to delete movie.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedMovie) return;
    setTitle(selectedMovie.title ?? "");
    setMovieId(String(selectedMovie.movie_id));
    setGenres(selectedMovie.genres ?? "");
    setRating(selectedMovie.rating != null ? String(selectedMovie.rating) : "");
    setOverview(selectedMovie.overview ?? "");
  }, [selectedMovie]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => navigate(-1)} className="text-sm text-white/60 hover:text-white">
              &lt;- Back
            </button>
            <h1 className="mt-2 text-2xl font-extrabold">Manage Movies</h1>
            <div className="mt-1 text-xs text-white/55">Add, edit, or delete movies in the catalog.</div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white/85">Movies</div>
            {loading ? (
              <div className="mt-4 text-sm text-white/60">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="mt-4 text-sm text-white/60">No movies found.</div>
            ) : (
              <div className="mt-4 space-y-2">
                {rows.map((m) => (
                  <button
                    key={m.movie_id}
                    type="button"
                    onClick={() => setSelectedId(String(m.movie_id))}
                    className={`w-full rounded-xl border border-white/10 px-3 py-2 text-left text-sm ${
                      selectedId === String(m.movie_id) ? "bg-white/10" : "bg-black/20"
                    } hover:bg-white/10`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{m.title}</span>
                      <span className="text-xs text-white/50">#{m.movie_id}</span>
                    </div>
                    {m.genres && <div className="text-xs text-white/50">{m.genres}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white/85">Editor</div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-white/60">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Movie ID (optional)</label>
                <input
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Genres</label>
                <input
                  value={genres}
                  onChange={(e) => setGenres(e.target.value)}
                  placeholder="Action|Drama"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Rating</label>
                <input
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Overview</label>
                <textarea
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={createMovie}
                  className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={updateMovie}
                  disabled={!selectedMovie}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 disabled:opacity-50"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={deleteMovie}
                  disabled={!selectedMovie}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
