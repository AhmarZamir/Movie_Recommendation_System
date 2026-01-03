import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { sanitizeText } from "../../utils/sanitize";
import type { MediaTitle } from "../../types/admin.types";
import type { ReviewOut } from "../../types/review.types";

export default function ModerateReviewsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReviewOut[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<{
    id: number;
    status: string;
    message: string;
  } | null>(null);

  async function load(nextQuery?: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get("/reviews/admin/all", {
        params: nextQuery?.trim() ? { q: nextQuery.trim() } : undefined,
      });
      const list = (res.data ?? []) as ReviewOut[];
      setRows(list);
      loadTitles(list);
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    const label = status.toLowerCase();
    setConfirm({
      id,
      status,
      message: `Change this review to ${label}?`,
    });
  }

  async function confirmStatusChange() {
    if (!confirm) return;
    const { id, status } = confirm;
    setErr(null);
    try {
      await http.patch(`/reviews/admin/${id}`, { status });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to update review.");
    } finally {
      setConfirm(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (!query.trim()) return true;
    const key = `${r.media_type}:${r.tmdb_id}`;
    const title = titles[key] ?? "";
    const hay = [
      r.user_name ?? "",
      String(r.user_id),
      title,
      String(r.tmdb_id),
      r.content ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  async function loadTitles(list: ReviewOut[]) {
    const keys = Array.from(new Set(list.map((r) => `${r.media_type}:${r.tmdb_id}`)));
    if (keys.length === 0) return;
    try {
      const results = await Promise.all(
        keys.map(async (key) => {
          const [mediaTypeRaw, idRaw] = key.split(":");
          const id = Number(idRaw);
          const type = mediaTypeRaw === "1" ? "tv" : "movie";
          const res = await http.get(`/tmdb/details/${id}`, { params: { type } });
          const data = res.data as MediaTitle;
          const title = data.title ?? data.name ?? `#${id}`;
          return [key, title] as const;
        })
      );
      setTitles((prev) => {
        const next = { ...prev };
        results.forEach(([key, title]) => {
          next[key] = title;
        });
        return next;
      });
    } catch {
      // keep ids if lookup fails
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="text-sm text-white/60 hover:text-white">
            &lt;- Back
          </button>
          <h1 className="mt-2 text-2xl font-extrabold">Moderate Reviews</h1>
          <div className="mt-1 text-xs text-white/55">Approve, flag, or remove user reviews.</div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user, movie, or content..."
            className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 outline-none focus:border-purple-400/50"
          />
          <button
            type="button"
            onClick={() => load(query)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
          >
            Search
          </button>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No reviews yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <div>
                    {(r.user_name ?? `User #${r.user_id}`)} (#{r.user_id}) •{" "}
                    {titles[`${r.media_type}:${r.tmdb_id}`] ??
                      `${r.media_type === 0 ? "Movie" : "TV"} #${r.tmdb_id}`} (#{r.tmdb_id})
                  </div>
                  <div>{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
                </div>
                <div className="mt-2 text-sm text-white/85">{sanitizeText(r.content)}</div>
                <div className="mt-3 flex items-center gap-2">
                  {["VISIBLE", "FLAGGED", "REMOVED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateStatus(r.id, s)}
                      className={`rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold ${
                        r.status === s ? "bg-white/15 text-white" : "bg-white/5 text-white/80"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.55)]">
            <div className="text-sm font-semibold text-white/90">Confirm action</div>
            <div className="mt-2 text-sm text-white/70">{confirm.message}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
