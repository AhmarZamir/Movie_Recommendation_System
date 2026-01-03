import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { User } from "lucide-react";
import { sanitizeText } from "../../utils/sanitize";
import type { UserOut } from "../../types/auth.types";
import type { ReviewOut } from "../../types/review.types";

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserOut | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [reviews, setReviews] = useState<ReviewOut[]>([]);
  const [reviewTitles, setReviewTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const avatarKey = useMemo(() => (user ? `profile_avatar_${user.id}` : null), [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [meRes, reviewsRes] = await Promise.all([http.get("/auth/me"), http.get("/reviews/me")]);
        if (!mounted) return;
        const me = meRes.data as UserOut;
        setUser(me);
        setName(me.name ?? "");
        setEmail(me.email ?? "");
        const list = (reviewsRes.data ?? []) as ReviewOut[];
        setReviews(list);
        loadReviewTitles(list);
        const stored = localStorage.getItem(`profile_avatar_${me.id}`);
        setAvatar(stored);
      } catch (e: any) {
        if (!mounted) return;
        if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
        else setErr((e.response?.data as any)?.detail || "Failed to load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function loadReviewTitles(list: ReviewOut[]) {
    const entries = Array.from(
      new Set(list.map((r) => `${r.media_type}:${r.tmdb_id}`))
    );
    if (entries.length === 0) return;
    try {
      const results = await Promise.all(
        entries.map(async (key) => {
          const [mediaTypeRaw, idRaw] = key.split(":");
          const id = Number(idRaw);
          const type = mediaTypeRaw === "1" ? "tv" : "movie";
          const res = await http.get(`/tmdb/details/${id}`, { params: { type } });
          const title = res.data?.title ?? res.data?.name ?? `#${id}`;
          return [key, title] as const;
        })
      );
      setReviewTitles((prev) => {
        const next = { ...prev };
        results.forEach(([key, title]) => {
          next[key] = title;
        });
        return next;
      });
    } catch {
      // Keep ids if details fetch fails.
    }
  }

  async function saveProfile() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setSaving(false);
        return setErr("Username cannot be blank.");
      }
      await http.patch("/auth/me", { name: trimmedName });
      setMsg("Profile updated.");
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSaving(false);
      return setErr("All password fields are required.");
    }
    if (newPassword !== confirmPassword) {
      setSaving(false);
      return setErr("New passwords do not match.");
    }
    try {
      await http.patch("/auth/me", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg("Password updated.");
    } catch (e: any) {
      if (axios.isAxiosError(e) && e.response?.status === 401) navigate("/auth/login");
      else setErr((e.response?.data as any)?.detail || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  function onPickAvatar(file?: File) {
    if (!file || !avatarKey) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      localStorage.setItem(avatarKey, result);
      setAvatar(result);
      window.dispatchEvent(new Event("profile-avatar-updated"));
      setMsg("Profile picture updated.");
    };
    reader.readAsDataURL(file);
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Profile</h1>
            <div className="mt-1 text-xs text-white/55">Manage your account and reviews.</div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}
        {msg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {msg}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white/85">Profile picture</div>
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-white/70" />
                )}
              </div>
              <label className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickAvatar(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white/85">Account details</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-white/60">Username</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Save profile
              </button>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="text-sm font-semibold text-white/85">Change password</div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs text-white/60">Current</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">New</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Confirm</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={updatePassword}
                  disabled={saving}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 disabled:opacity-60"
                >
                  Update password
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/85">Your reviews</div>
          {reviews.length === 0 ? (
            <div className="mt-4 text-sm text-white/60">No reviews yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>
                      {r.media_type === 0 ? "Movie" : "TV"}{" "}
                      {reviewTitles[`${r.media_type}:${r.tmdb_id}`] ?? `#${r.tmdb_id}`}
                    </span>
                    <span>{formatDate(r.created_at)}</span>
                  </div>
                  <div className="mt-2 text-sm text-white/85">{sanitizeText(r.content)}</div>
                  <div className="mt-2 text-xs text-white/60">Rating: {r.user_score ?? 0} / 5</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
