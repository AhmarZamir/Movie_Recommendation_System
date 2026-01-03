import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import type { Analytics, MediaTitle } from "../../types/admin.types";

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get("/admin/analytics");
      const payload = res.data as Analytics;
      setData(payload);
      loadTitles(payload);
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadTitles(payload: Analytics) {
    const keys = payload.top_movies.map((m) => `${m.media_type}:${m.tmdb_id}`);
    const unique = Array.from(new Set(keys));
    try {
      const results = await Promise.all(
        unique.map(async (key) => {
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
          <h1 className="mt-2 text-2xl font-extrabold">Analytics</h1>
          <div className="mt-1 text-xs text-white/55">Top reviewed movies and active users.</div>
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
        ) : !data ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No analytics data.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white/85">Top Movies</div>
              <div className="mt-4 space-y-2">
                {data.top_movies.length === 0 ? (
                  <div className="text-sm text-white/60">No reviews yet.</div>
                ) : (
                  data.top_movies.map((m) => (
                    <div key={`${m.media_type}-${m.tmdb_id}`} className="flex items-center justify-between text-sm">
                      <div className="text-white/80">
                        {titles[`${m.media_type}:${m.tmdb_id}`] ??
                          `${m.media_type === 0 ? "Movie" : "TV"} #${m.tmdb_id}`}
                      </div>
                      <div className="text-white/60">
                        {m.reviews} reviews • Avg {m.avg_score.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold text-white/85">Most Active Users</div>
              <div className="mt-4 space-y-2">
                {data.top_users.length === 0 ? (
                  <div className="text-sm text-white/60">No users yet.</div>
                ) : (
                  data.top_users.map((u) => (
                    <div key={u.user_id} className="flex items-center justify-between text-sm">
                      <div className="text-white/80">
                        {u.name ?? `User #${u.user_id}`}
                      </div>
                      <div className="text-white/60">{u.reviews} reviews</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
