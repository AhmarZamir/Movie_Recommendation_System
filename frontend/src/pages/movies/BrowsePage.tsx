import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { http } from "../../api/http";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { ChevronDown, Star, SlidersHorizontal, Search } from "lucide-react";
import type { MediaType, TMDBGenre, TMDBListItem, TMDBPaged } from "../../types/tmdb.types";

type SortKey = "relevance" | "popularity" | "rating" | "release";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "popularity", label: "Popularity" },
  { key: "rating", label: "Rating" },
  { key: "release", label: "Release Date" },
];

const RATING_OPTIONS: { label: string; min: number | null }[] = [
  { label: "Any Rating", min: null },
  { label: "9+", min: 9 },
  { label: "8+", min: 8 },
  { label: "7+", min: 7 },
  { label: "6+", min: 6 },
];

function tmdbImg(path: string | null, size: "w342" | "w500" = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

function getYear(d?: string) {
  if (!d) return "";
  const y = new Date(d).getFullYear();
  return Number.isFinite(y) ? String(y) : "";
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeType(t: string | null): MediaType {
  const x = (t || "movie").toLowerCase().trim();
  return x === "tv" ? "tv" : "movie";
}

export default function BrowsePage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  const type: MediaType = normalizeType(sp.get("type"));
  const q = (sp.get("q") || "").trim();

  const FALLBACK_GENRES_MOVIE: TMDBGenre[] = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Science Fiction" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" },
  ];

  const FALLBACK_GENRES_TV: TMDBGenre[] = [
    { id: 10759, name: "Action & Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 10762, name: "Kids" },
    { id: 9648, name: "Mystery" },
    { id: 10763, name: "News" },
    { id: 10764, name: "Reality" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 10766, name: "Soap" },
    { id: 10767, name: "Talk" },
    { id: 10768, name: "War & Politics" },
    { id: 37, name: "Western" },
  ];

  const [genres, setGenres] = useState<TMDBGenre[]>([]);

  const allGenres = useMemo(() => {
    if (genres.length) return genres;
    return type === "tv" ? FALLBACK_GENRES_TV : FALLBACK_GENRES_MOVIE;
  }, [genres, type]);

  const genreMap = useMemo(() => new Map(allGenres.map((g) => [g.id, g.name])), [allGenres]);

  const [draftGenreIds, setDraftGenreIds] = useState<Set<number>>(new Set());
  const [draftMinRating, setDraftMinRating] = useState<number | null>(null);
  const [draftYearFrom, setDraftYearFrom] = useState<string>("");
  const [draftYearTo, setDraftYearTo] = useState<string>("");
  const [draftSort, setDraftSort] = useState<SortKey>("relevance");

  const [appliedGenreIds, setAppliedGenreIds] = useState<number[]>([]);
  const [appliedMinRating, setAppliedMinRating] = useState<number | null>(null);
  const [appliedYearFrom, setAppliedYearFrom] = useState<string>("");
  const [appliedYearTo, setAppliedYearTo] = useState<string>("");
  const [appliedSort, setAppliedSort] = useState<SortKey>("relevance");

  const [page, setPage] = useState<number>(Number(sp.get("page") || 1) || 1);
  const [data, setData] = useState<TMDBPaged<TMDBListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [openGenre, setOpenGenre] = useState(true);
  const [openRating, setOpenRating] = useState(true);
  const [openYear, setOpenYear] = useState(true);

  const [genreQuery, setGenreQuery] = useState("");
  const [showAllGenres, setShowAllGenres] = useState(false);

  const filteredGenres = useMemo(() => {
    const qq = genreQuery.trim().toLowerCase();
    if (!qq) return allGenres;
    return allGenres.filter((g) => g.name.toLowerCase().includes(qq));
  }, [allGenres, genreQuery]);

  const visibleGenres = useMemo(() => {
    return showAllGenres ? filteredGenres : filteredGenres.slice(0, 12);
  }, [filteredGenres, showAllGenres]);

  useEffect(() => {
    setDraftGenreIds(new Set());
    setAppliedGenreIds([]);
    setGenreQuery("");
    setShowAllGenres(false);
    setPage(1);
  }, [type]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await http.get(`/tmdb/genre/list`, { params: { type } });
        const list = (res.data?.genres ?? []) as TMDBGenre[];
        if (!mounted) return;
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
        setGenres(sorted);
      } catch {
      }
    })();
    return () => {
      mounted = false;
    };
  }, [type]);

  useEffect(() => {
    const next = new URLSearchParams(sp);
    next.set("page", String(page));
    setSp(next, { replace: true });
  }, [page, sp, setSp]);

  const matchesFilters = (m: TMDBListItem) => {
    if (appliedMinRating != null && (m.vote_average ?? 0) < appliedMinRating) return false;

    const yearStr = getYear(m.release_date || m.first_air_date);
    const year = yearStr ? Number(yearStr) : NaN;

    if (appliedYearFrom.trim()) {
      const yFrom = Number(appliedYearFrom.trim());
      if (Number.isFinite(yFrom) && (!Number.isFinite(year) || year < yFrom)) return false;
    }
    if (appliedYearTo.trim()) {
      const yTo = Number(appliedYearTo.trim());
      if (Number.isFinite(yTo) && (!Number.isFinite(year) || year > yTo)) return false;
    }

    if (appliedGenreIds.length) {
      const ids = m.genre_ids ?? [];
      const ok = ids.some((id) => appliedGenreIds.includes(id));
      if (!ok) return false;
    }

    return true;
  };

  const sortLocal = (arr: TMDBListItem[]) => {
    const out = [...arr];
    if (appliedSort === "rating") {
      out.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
    } else if (appliedSort === "release") {
      out.sort(
        (a, b) =>
          new Date(b.release_date || b.first_air_date || "1970-01-01").getTime() -
          new Date(a.release_date || a.first_air_date || "1970-01-01").getTime()
      );
    } else if (appliedSort === "popularity") {
      out.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    }
    return out;
  };

  function tmdbSortBy(): string | undefined {
    if (appliedSort === "rating") return "vote_average.desc";
    if (appliedSort === "popularity") return "popularity.desc";
    if (appliedSort === "release") return type === "tv" ? "first_air_date.desc" : "primary_release_date.desc";
    return undefined;
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const usingSearch = !!q;

        if (usingSearch) {
          const res = await http.get(`/tmdb/search`, { params: { type, query: q, page } });
          const raw = res.data as TMDBPaged<TMDBListItem>;
          const filtered = sortLocal((raw.results ?? []).filter(matchesFilters));

          if (!mounted) return;
          setData({ ...raw, results: filtered });
        } else {
          const params: any = {
            type,
            page,
            sort_by: tmdbSortBy(),
            with_genres: appliedGenreIds.length ? appliedGenreIds.join(",") : undefined,
            vote_average_gte: appliedMinRating ?? undefined,
            year_from: appliedYearFrom.trim() ? Number(appliedYearFrom.trim()) : undefined,
            year_to: appliedYearTo.trim() ? Number(appliedYearTo.trim()) : undefined,
          };

          const res = await http.get(`/tmdb/discover`, { params });
          if (!mounted) return;
          setData(res.data as TMDBPaged<TMDBListItem>);
        }
      } catch (e: any) {
        if (!mounted) return;
        if (axios.isAxiosError(e)) setErr((e.response?.data as any)?.detail || "Failed to load browse results.");
        else setErr(e?.message ?? "Failed to load browse results.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [type, q, page, appliedGenreIds, appliedMinRating, appliedYearFrom, appliedYearTo, appliedSort]);

  function toggleDraftGenre(id: number) {
    setDraftGenreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyFilters() {
    setAppliedGenreIds(Array.from(draftGenreIds));
    setAppliedMinRating(draftMinRating);
    setAppliedYearFrom(draftYearFrom);
    setAppliedYearTo(draftYearTo);
    setAppliedSort(draftSort);
    setPage(1);
  }

  function resetAll() {
    setDraftGenreIds(new Set());
    setDraftMinRating(null);
    setDraftYearFrom("");
    setDraftYearTo("");
    setDraftSort("relevance");

    setAppliedGenreIds([]);
    setAppliedMinRating(null);
    setAppliedYearFrom("");
    setAppliedYearTo("");
    setAppliedSort("relevance");

    setGenreQuery("");
    setShowAllGenres(false);
    setPage(1);
  }

  const titleText = q
    ? `Search results for '${q}'`
    : type === "tv"
    ? "Browse TV Shows"
    : "Browse Movies";

  const showingText = data
    ? `Showing ${(data.page - 1) * 20 + 1}-${(data.page - 1) * 20 + (data.results?.length ?? 0)} of ${data.total_results.toLocaleString()} ${type === "tv" ? "shows" : "movies"}`
    : "";

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_520px_at_20%_10%,rgba(168,85,247,0.25),transparent_60%),radial-gradient(700px_480px_at_80%_15%,rgba(236,72,153,0.18),transparent_60%),linear-gradient(to_bottom,rgba(0,0,0,0.92),rgba(0,0,0,1))] text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        {/* Header row */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">{titleText}</h1>
            <div className="mt-1 text-xs text-white/55">{showingText}</div>
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end">
            <div className="flex items-center gap-2 text-xs text-white/65">
              <span>Sort By:</span>
            </div>

            <select
              value={draftSort}
              onChange={(e) => setDraftSort(e.target.value as SortKey)}
              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/85 outline-none focus:border-purple-400/50"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key} className="bg-black">
                  {s.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={applyFilters}
              className="hidden rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold shadow-[0_10px_30px_rgba(168,85,247,0.25)] md:inline-flex"
              title="Apply sort"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Content grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filters */}
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </div>
              <button
                type="button"
                onClick={resetAll}
                className="text-xs font-semibold text-purple-300 hover:text-purple-200"
              >
                Reset All
              </button>
            </div>

            {/* Genre */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setOpenGenre((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="text-sm font-semibold text-white/80">Genre</div>
                <ChevronDown className={cx("h-4 w-4 text-white/50 transition", openGenre ? "rotate-180" : "")} />
              </button>

              {openGenre && (
                <div className="mt-3">
                  <input
                    value={genreQuery}
                    onChange={(e) => setGenreQuery(e.target.value)}
                    placeholder="Search genre..."
                    className="h-9 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 outline-none focus:border-purple-400/50"
                  />

                  <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                    {visibleGenres.map((g) => (
                      <label key={g.id} className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
                        <input
                          type="checkbox"
                          checked={draftGenreIds.has(g.id)}
                          onChange={() => toggleDraftGenre(g.id)}
                          className="h-4 w-4 rounded border-white/20 bg-black/30"
                        />
                        <span>{g.name}</span>
                      </label>
                    ))}
                  </div>

                  {filteredGenres.length > 12 && (
                    <button
                      type="button"
                      onClick={() => setShowAllGenres((v) => !v)}
                      className="mt-3 text-xs font-semibold text-purple-300 hover:text-purple-200"
                    >
                      {showAllGenres ? "Show less" : `Show all (${filteredGenres.length})`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setOpenRating((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="text-sm font-semibold text-white/80">Rating</div>
                <ChevronDown className={cx("h-4 w-4 text-white/50 transition", openRating ? "rotate-180" : "")} />
              </button>

              {openRating && (
                <div className="mt-3 space-y-2">
                  {RATING_OPTIONS.map((r) => (
                    <label key={r.label} className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
                      <input
                        type="radio"
                        name="rating"
                        checked={draftMinRating === r.min}
                        onChange={() => setDraftMinRating(r.min)}
                        className="h-4 w-4 border-white/20 bg-black/30"
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Release Year */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setOpenYear((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="text-sm font-semibold text-white/80">Release Year</div>
                <ChevronDown className={cx("h-4 w-4 text-white/50 transition", openYear ? "rotate-180" : "")} />
              </button>

              {openYear && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    value={draftYearFrom}
                    onChange={(e) => setDraftYearFrom(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                    placeholder="From"
                    className="h-9 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 outline-none focus:border-purple-400/50"
                  />
                  <input
                    value={draftYearTo}
                    onChange={(e) => setDraftYearTo(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                    placeholder="To"
                    className="h-9 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 outline-none focus:border-purple-400/50"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={applyFilters}
              className="mt-6 w-full rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold shadow-[0_10px_30px_rgba(168,85,247,0.25)]"
            >
              Apply Filters
            </button>

            {q ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
                <Search className="h-3.5 w-3.5" />
                Showing results for <span className="font-semibold text-white/70">{q}</span>
              </div>
            ) : null}
          </aside>

          {/* Results */}
          <main>
            {err ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {err}
              </div>
            ) : loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="aspect-[2/3] w-full rounded-xl bg-white/10" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-white/10" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {(data?.results ?? []).map((m) => (
                    <MovieCard
                      key={m.id}
                      m={m}
                      genreMap={genreMap}
                      onClick={() => navigate(type === "tv" ? `/tv/${m.id}` : `/movie/${m.id}`)}
                    />
                  ))}
                </div>

                <div className="mt-8 flex justify-center">
                  <Pagination
                    page={data?.page ?? 1}
                    totalPages={Math.min(data?.total_pages ?? 1, 500)}
                    onPage={(p) => setPage(p)}
                  />
                </div>
              </>
            )}
          </main>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function MovieCard({
  m,
  genreMap,
  onClick,
}: {
  m: TMDBListItem;
  genreMap: Map<number, string>;
  onClick: () => void;
}) {
  const title = m.title || m.name || "Untitled";
  const year = getYear(m.release_date || m.first_air_date);
  const rating = Number(m.vote_average ?? 0);
  const poster = tmdbImg(m.poster_path, "w342");

  const genreLabel = useMemo(() => {
    const ids = m.genre_ids ?? [];
    if (!ids.length) return "";
    const first = genreMap.get(ids[0]);
    return first ?? "";
  }, [m.genre_ids, genreMap]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-2xl border border-white/10 bg-white/5 p-3 text-left shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20"
    >
      <div className="relative overflow-hidden rounded-xl">
        <div className="aspect-[2/3] w-full bg-white/10">
          {poster ? (
            <img
              src={poster}
              alt={title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
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
          {year ? year : "—"}
          {genreLabel ? `  •  ${genreLabel}` : ""}
        </div>
      </div>
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const items = useMemo(() => {
    const out: Array<number | "…"> = [];
    const push = (x: number | "…") => out.push(x);

    const clamp = (n: number) => Math.max(1, Math.min(totalPages, n));
    const p = clamp(page);

    const windowSize = 1;
    const left = Math.max(2, p - windowSize);
    const right = Math.min(totalPages - 1, p + windowSize);

    push(1);
    if (left > 2) push("…");
    for (let i = left; i <= right; i++) push(i);
    if (right < totalPages - 1) push("…");
    if (totalPages > 1) push(totalPages);

    return out;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPage(Math.max(1, page - 1))}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        aria-label="Previous page"
      >
        ‹
      </button>

      {items.map((it, idx) =>
        it === "…" ? (
          <div key={`dots-${idx}`} className="px-2 text-sm text-white/45">
            …
          </div>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onPage(it)}
            className={cx(
              "min-w-[38px] rounded-xl border px-3 py-2 text-sm font-semibold",
              it === page
                ? "border-purple-400/40 bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-[0_10px_30px_rgba(168,85,247,0.25)]"
                : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            )}
          >
            {it}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}
