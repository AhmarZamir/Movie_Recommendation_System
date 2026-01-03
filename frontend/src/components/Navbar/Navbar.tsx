import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, User } from "lucide-react";
import { http } from "../../api/http";

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

export default function Navbar() {
  const [q, setQ] = useState("");
  const [authed, setAuthed] = useState<boolean>(() => !!localStorage.getItem("access_token"));
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const type = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const t = (sp.get("type") || "movie").toLowerCase();
    return t === "tv" ? "tv" : "movie";
  }, [location.search]);

  useEffect(() => {
    const sync = () => {
      setAuthed(!!localStorage.getItem("access_token"));
      const uid = decodeUserIdFromToken();
      setAvatar(uid ? localStorage.getItem(`profile_avatar_${uid}`) : null);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return setIsAdmin(false);
        const part = token.split(".")[1];
        const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(json);
        setIsAdmin((payload.role || "").toUpperCase() === "ADMIN");
      } catch {
        setIsAdmin(false);
      }
    };
    sync();
    window.addEventListener("auth-changed", sync);
    window.addEventListener("profile-avatar-updated", sync as EventListener);
    return () => {
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("profile-avatar-updated", sync as EventListener);
    };
  }, []);

  function handleSearch(term: string) {
    const cleaned = term.trim();
    if (!cleaned) return;

    const key = `recent_searches_${decodeUserIdFromToken() ?? "anon"}`;
    const prev = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    const next = [cleaned, ...prev.filter((x) => x.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("recent_searches_updated"));

    const seedKey = `recommendation_seed_${decodeUserIdFromToken() ?? "anon"}`;
    localStorage.setItem(
      seedKey,
      JSON.stringify({ kind: "search", term: cleaned, ts: Date.now() })
    );
    window.dispatchEvent(new Event("recommendation_seed_updated"));

    setShowSuggestions(false);
    navigate(`/browse?type=${type}&q=${encodeURIComponent(cleaned)}&page=1`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    handleSearch(q);
  }

  const logout = () => {
    localStorage.removeItem("access_token");
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/home");
  };

  useEffect(() => {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }

    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let cancelled = false;
    setSuggesting(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await http.get("/tmdb/search", {
          params: { query: term, type, page: 1 },
        });
        if (cancelled) return;
        const list = (res.data?.results ?? []).slice(0, 6);
        setSuggestions(list);
        setShowSuggestions(true);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (!cancelled) setSuggesting(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [q, type]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-6 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {/* Brand */}
        <Link to="/home" className="flex items-center gap-2 font-extrabold">
          <img src="/logo.png" alt="Cinematic AI" className="h-6 w-6" />
          <span className="tracking-tight">Cinematic AI</span>
        </Link>

        {/* Links */}
        <nav className="hidden items-center gap-4 text-sm text-white/70 md:flex">
          <Link to="/home" className="hover:text-white">Home</Link>

          <Link to="/browse?type=movie" className="hover:text-white">Movies</Link>
          <Link to="/browse?type=tv" className="hover:text-white">TV Shows</Link>

          <Link to="/playlists" className="hover:text-white">My List</Link>
          {isAdmin && <Link to="/admin" className="hover:text-white">Admin</Link>}
        </nav>

        {/* Search */}
        <form onSubmit={submit} className="relative ml-auto hidden md:block">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              if (suggestions.length) setShowSuggestions(true);
            }}
            onBlur={() => {
              blurTimer.current = window.setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder={`Search ${type === "tv" ? "TV shows" : "movies"}...`}
            className="w-[360px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          />
          {showSuggestions && (
            <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-black/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              {suggesting ? (
                <div className="px-4 py-3 text-xs text-white/60">Searching...</div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-white/60">No matches found.</div>
              ) : (
                <div className="max-h-72 overflow-auto">
                  {suggestions.map((item) => {
                    const label = item.title ?? item.name ?? "Untitled";
                    return (
                      <button
                        key={`${item.id}-${label}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSearch(label)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                      >
                        <span className="truncate">{label}</span>
                        <span className="ml-auto text-xs text-white/40">
                          {item.media_type ?? type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {authed ? (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                title="Profile"
              >
                {avatar ? (
                  <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={logout}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/auth/register")}
                className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate("/auth/login")}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
