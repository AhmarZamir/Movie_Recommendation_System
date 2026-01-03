import AddToPlaylistButton from "../Playlists/AddToPlaylistButton";
import PublicPlaylistsButton from "../Playlists/PublicPlaylistsButton";
import { Star } from "lucide-react";
import type { MediaType, TMDBGenre } from "../../types/tmdb.types";

type Props = {
  tmdbId: number;
  mediaType: MediaType;

  title: string;
  tagline?: string;
  backdropPath: string | null;
  posterPath: string | null;
  releaseDate?: string;
  runtime?: number;
  genres?: TMDBGenre[];

  movieRating10: number;
  movieVotes: number;
  userScore5: number;

  onPrimary?: () => void;
  onFavorite?: () => void;
};

export default function MovieDetailBanner({
  tmdbId,
  mediaType,
  title,
  tagline,
  backdropPath,
  posterPath,
  releaseDate,
  runtime,
  genres,
  movieRating10,
  movieVotes,
  userScore5,
  onPrimary,
  onFavorite,
}: Props) {
  const backdrop = backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : "";
  const poster = posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : "";

  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";
  const runtimeText = runtime ? `${Math.floor(runtime / 60)}h ${runtime % 60}m` : "";
  const genresText = genres?.slice(0, 3).map((g) => g.name).join(" • ") ?? "";

  return (
    <section className="mx-auto max-w-6xl px-6 pt-6">
      <div className="relative rounded-3xl border border-white/10 bg-white/5">
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          {backdrop && (
            <img
              src={backdrop}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
        </div>

        <div className="relative grid gap-6 p-6 md:grid-cols-[180px_1fr] md:p-10">
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.55)]">
              <img
                src={poster || "https://via.placeholder.com/342x513?text=No+Poster"}
                alt={title}
                className="h-[260px] w-[180px] object-cover"
              />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold md:text-5xl">{title}</h1>
            {tagline ? <div className="mt-2 text-sm italic text-white/60">“{tagline}”</div> : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
              {year ? <span>{year}</span> : null}
              {runtimeText ? <span>• {runtimeText}</span> : null}
              {genresText ? <span>• {genresText}</span> : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/35">
                  <span className="text-sm font-extrabold">{movieRating10.toFixed(1)}</span>
                </div>
                <div>
                  <div className="text-xs text-white/55">Movie Rating (TMDB)</div>
                  <div className="text-sm font-semibold text-white/90">{movieVotes.toLocaleString()} votes</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2">
                <div className="text-xs text-white/55">User Score</div>
                <StarsRating value={userScore5} />
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-3">
                <button
                  onClick={onPrimary}
                  className="rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold shadow-[0_10px_30px_rgba(168,85,247,0.25)]"
                >
                  ▶ Play Trailer
                </button>
                <AddToPlaylistButton tmdbId={tmdbId} mediaType={mediaType} variant="icon" />

                <button
                  onClick={onFavorite}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                  title="Add to Favorites"
                >♥
                </button>

                <PublicPlaylistsButton tmdbId={tmdbId} mediaType={mediaType} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StarsRating({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(5, value));
  return (
    <div className="mt-1 flex items-center gap-1" aria-label={`User score ${clamped} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fillPct = Math.max(0, Math.min(1, clamped - (n - 1))) * 100;
        return (
          <span key={n} className="relative inline-block h-5 w-5">
            <Star className="h-5 w-5 text-white/25" />
            {fillPct > 0 && (
              <span className="absolute left-0 top-0 h-full overflow-hidden" style={{ width: `${fillPct}%` }}>
                <Star className="h-5 w-5 text-yellow-300" fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
