import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import { ThumbsUp, ThumbsDown, Flag, Pencil, Trash2, Star, User } from "lucide-react";
import { sanitizeText } from "../../utils/sanitize";
import type { RatingBreakdown, ReviewOut } from "../../types/review.types";

type Props = {
  tmdbId: number;
  mediaType?: number;
};

const EMPTY_BREAKDOWN: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

function clampTo5(avg: number) {
  return avg > 5 ? avg / 2 : avg;
}

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

export default function ReviewsSection({ tmdbId, mediaType = 0 }: Props) {
  const navigate = useNavigate();
  const meId = useMemo(() => decodeUserIdFromToken(), []);

  const [authed, setAuthed] = useState(() => !!localStorage.getItem("access_token"));
  const [rb, setRb] = useState<RatingBreakdown | null>(null);

  const [myScore, setMyScore] = useState<number>(0);
  const [myReview, setMyReview] = useState<ReviewOut | null>(null);
  const [others, setOthers] = useState<ReviewOut[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showComposer, setShowComposer] = useState(true);
  const [text, setText] = useState("");
  const [myAvatar, setMyAvatar] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [sortBy, setSortBy] = useState<"highest" | "lowest">("highest");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const [rbRes, reviewsRes] = await Promise.all([
        http.get(`/ratings/breakdown/${tmdbId}`, { params: { media_type: mediaType } }),
        http.get(`/reviews/${tmdbId}`, { params: { media_type: mediaType } }),
      ]);

      const rbData = rbRes.data as RatingBreakdown;
      setRb({
        ...rbData,
        avg_score: clampTo5(rbData.avg_score),
        breakdown: rbData.breakdown ?? EMPTY_BREAKDOWN,
      });

      const list = ((reviewsRes.data as ReviewOut[]) ?? []).filter((x) => x.status !== "REMOVED");

      const mine = meId ? list.find((r) => r.user_id === meId) ?? null : null;
      setMyReview(mine);
      setOthers(meId ? list.filter((r) => r.user_id !== meId) : list);

      if (mine) {
        setShowComposer(false);
        setText("");
      } else {
        setShowComposer(true);
      }

      if (localStorage.getItem("access_token")) {
        const me = await http.get(`/ratings/me`);
        const mineRating = (me.data as any[]).find(
          (x) => x.tmdb_id === tmdbId && x.media_type === mediaType
        );
        setMyScore(mineRating?.score ?? 0);
      } else {
        setMyScore(0);
      }
    } catch (e: any) {
      if (axios.isAxiosError(e)) setErr((e.response?.data as any)?.detail || "Failed to load reviews/ratings.");
      else setErr(e?.message ?? "Failed to load reviews/ratings.");
    } finally {
      setLoading(false);
    }
  }, [tmdbId, mediaType, meId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const sync = () => {
      setAuthed(!!localStorage.getItem("access_token"));
      if (meId) {
        setMyAvatar(localStorage.getItem(`profile_avatar_${meId}`));
      } else {
        setMyAvatar(null);
      }
      loadAll();
    };
    window.addEventListener("auth-changed", sync);
    window.addEventListener("profile-avatar-updated", sync as EventListener);
    sync();
    return () => window.removeEventListener("auth-changed", sync);
  }, [loadAll]);

  const sortedOthers = useMemo(() => {
    const list = [...others];
    list.sort((a, b) => {
      const aScore = a.user_score ?? 0;
      const bScore = b.user_score ?? 0;
      return sortBy === "highest" ? bScore - aScore : aScore - bScore;
    });
    return list;
  }, [others, sortBy]);

  async function setRating(score: number) {
    setErr(null);
    if (!localStorage.getItem("access_token")) return navigate("/auth/login");

    try {
      await http.put(`/ratings`, { tmdb_id: tmdbId, media_type: mediaType, score });
      setMyScore(score);
      await loadAll();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to save rating.");
    }
  }

  async function postReview() {
    setErr(null);
    if (!localStorage.getItem("access_token")) return navigate("/auth/login");

    // ✅ extra guard: 1 review only
    if (myReview) return setErr("You already posted a review. Please edit it.");

    if (!text.trim()) return setErr("Review cannot be empty.");

    try {
      await http.post(`/reviews`, {
        tmdb_id: tmdbId,
        media_type: mediaType,
        parent_id: null,
        content: text.trim(),
      });
      setText("");
      setShowComposer(false);
      await loadAll();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to post review.");
    }
  }

  async function saveEdit(reviewId: number) {
    setErr(null);
    if (!localStorage.getItem("access_token")) return navigate("/auth/login");
    if (!editText.trim()) return setErr("Review cannot be empty.");

    try {
      await http.put(`/reviews/${reviewId}`, { content: editText.trim() });
      setEditingId(null);
      setEditText("");
      await loadAll();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to edit review.");
    }
  }

  async function deleteReview(reviewId: number) {
    setErr(null);
    if (!localStorage.getItem("access_token")) return navigate("/auth/login");

    try {
      await http.delete(`/reviews/${reviewId}`);
      await loadAll();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to delete review.");
    }
  }

  async function vote(reviewId: number, value: 1 | -1) {
    setErr(null);
    if (!localStorage.getItem("access_token")) return navigate("/auth/login");
    try {
      await http.post(`/reviews/${reviewId}/vote`, { value });
      await loadAll();
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to vote.");
    }
  }

  const avg5 = rb?.avg_score ?? 0;
  const totalRatings = rb?.count ?? 0;
  const breakdown = rb?.breakdown ?? EMPTY_BREAKDOWN;

  if (loading) {
    return (
      <section className="mx-auto mt-7 max-w-6xl px-6">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur">
          <div className="h-6 w-40 rounded bg-white/10" />
          <div className="mt-4 h-24 rounded bg-white/5" />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-7 max-w-6xl px-6">
      {err && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Rating summary */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-2xl font-extrabold">Movie Reviews</div>
            <div className="mt-3 flex items-center gap-3">
              <StarsStatic value={avg5} />
              <div className="text-sm text-white/70">
                Based on {totalRatings} {totalRatings === 1 ? "rating" : "ratings"}
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl space-y-3">
            {[5, 4, 3, 2, 1].map((s) => (
              <BreakdownRow key={s} star={s} count={breakdown[s] ?? 0} total={totalRatings} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-[linear-gradient(to_bottom,rgba(168,85,247,0.12),rgba(0,0,0,0.25))] p-6 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-gradient-to-b from-purple-500 to-fuchsia-500" />
          <div className="text-lg font-extrabold">Community Reviews</div>
        </div>
        {!myReview && showComposer && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-white/10 ring-1 ring-white/10" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-white/75">Review by You</div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder="What did you think of the movie?"
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-purple-400/50"
                />

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className="p-1"
                        aria-label={`Rate ${n} stars`}
                        title={`Rate ${n} stars`}
                      >
                        <Star
                          className={`h-5 w-5 ${n <= myScore ? "text-yellow-300" : "text-white/25"}`}
                          fill={n <= myScore ? "currentColor" : "none"}
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!authed) return navigate("/auth/login");
                      postReview();
                    }}
                    className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold shadow-[0_10px_30px_rgba(168,85,247,0.25)]"
                  >
                    Post Review
                  </button>
                </div>

                {!authed && (
                  <div className="mt-3 text-xs text-white/50">
                    You need to log in to post a review.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* My review (top) */}
        {myReview && (
          <div className="mt-4">
            <ReviewCard
              r={myReview}
              isMine
              currentScore={myScore}
              onRate={setRating}
              avatarUrl={myAvatar}
              onEdit={() => {
                setEditingId(myReview.id);
                setEditText(myReview.content);
              }}
              onDelete={() => deleteReview(myReview.id)}
              editing={editingId === myReview.id}
              editText={editText}
              setEditText={setEditText}
              onSaveEdit={() => saveEdit(myReview.id)}
              onCancelEdit={() => {
                setEditingId(null);
                setEditText("");
              }}
              onVote={vote}
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between text-sm text-white/60">
          <div />
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <button
              type="button"
              onClick={() => setSortBy("highest")}
              className={`rounded-lg border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10 ${
                sortBy === "highest" ? "bg-white/15" : "bg-white/5"
              }`}
            >
              Highest Rating
            </button>
            <button
              type="button"
              onClick={() => setSortBy("lowest")}
              className={`rounded-lg border border-white/10 px-3 py-1.5 text-white/80 hover:bg-white/10 ${
                sortBy === "lowest" ? "bg-white/15" : "bg-white/5"
              }`}
            >
              Lowest Rating
            </button>
          </div>
        </div>

        {/* Others */}
        <div className="mt-4 space-y-4">
          {sortedOthers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
              No reviews yet.
            </div>
          ) : (
            sortedOthers.map((r) => (
              <ReviewCard key={r.id} r={r} isMine={false} onVote={vote} />
            ))
          )}
        </div>

        <button className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10">
          Load More Reviews
        </button>
      </div>
    </section>
  );
}

function StarsStatic({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= full ? "text-yellow-300" : "text-white/25"}`}
          fill={n <= full ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function BreakdownRow({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 text-sm font-semibold text-white/80">{star}</div>
      <Star className="h-4 w-4 text-yellow-300" fill="currentColor" />
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-yellow-300/90" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-right text-sm text-white/70">{pct}%</div>
    </div>
  );
}

function formatWrittenAt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `Written on ${d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })}, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

function ReviewCard({
  r,
  isMine,
  currentScore,
  onRate,
  avatarUrl,
  onEdit,
  onDelete,
  onVote,
  editing,
  editText,
  setEditText,
  onSaveEdit,
  onCancelEdit,
}: {
  r: ReviewOut;
  isMine: boolean;
  currentScore?: number;
  onRate?: (score: number) => void;
  avatarUrl?: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onVote: (reviewId: number, value: 1 | -1) => void;
  editing?: boolean;
  editText?: string;
  setEditText?: (v: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}) {
  const name = r.user_name?.trim() ? r.user_name : r.user_id ? `User #${r.user_id}` : "User";
  const written = formatWrittenAt(r.created_at);
  const up = r.upvotes ?? 0;
  const down = r.downvotes ?? 0;

  const score = isMine ? currentScore ?? 0 : r.user_score ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
          {isMine && avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-white/60" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-bold text-white/90">{isMine ? "Review by You" : name}</div>

              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) =>
                  isMine && onRate ? (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onRate(n)}
                      className="p-0.5"
                      aria-label={`Rate ${n} stars`}
                      title="Update your rating"
                    >
                      <Star
                        className={`h-4 w-4 ${n <= score ? "text-yellow-300" : "text-white/20"}`}
                        fill={n <= score ? "currentColor" : "none"}
                      />
                    </button>
                  ) : (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${n <= score ? "text-yellow-300" : "text-white/20"}`}
                      fill={n <= score ? "currentColor" : "none"}
                    />
                  )
                )}
              </div>

              {written && <div className="mt-1 text-xs text-white/45">{written}</div>}
            </div>
            {isMine ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            ) : null}
          </div>

          {editing ? (
            <div className="mt-4">
              <textarea
                value={editText ?? ""}
                onChange={(e) => setEditText?.(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-purple-400/50"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={onCancelEdit}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={onSaveEdit}
                  className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-white/70">{sanitizeText(r.content)}</p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-white/60">
              <button onClick={() => onVote(r.id, 1)} className="inline-flex items-center gap-2 hover:text-white">
                <ThumbsUp className="h-4 w-4" /> {up}
              </button>
              <button onClick={() => onVote(r.id, -1)} className="inline-flex items-center gap-2 hover:text-white">
                <ThumbsDown className="h-4 w-4" /> {down}
              </button>
            </div>

            {!isMine && (
              <button className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
                <Flag className="h-4 w-4" /> Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
