import AddToPlaylistButton from "../Playlists/AddToPlaylistButton";

type Props = {
  title: string;
  overview: string;
  backdropPath: string | null;
  rating?: number;
  metaLine?: string;
  onPrimary?: () => void;  // Watch Trailer
  onSecondary?: () => void; // Add to Watchlist
  playlistPicker?: {
    tmdbId: number;
    mediaType: "movie" | "tv";
  };
  onClick?: () => void;
};

export default function HeroBanner({
  title,
  overview,
  backdropPath,
  rating,
  metaLine,
  onPrimary,
  onSecondary,
  playlistPicker,
  onClick,
}: Props) {
  const backdrop = backdropPath
    ? `https://image.tmdb.org/t/p/original${backdropPath}`
    : "";

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
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
        </div>
        <div
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClick?.();
          }}
          role="button"
          tabIndex={0}
          className="relative w-full text-left focus:outline-none focus:ring-2 focus:ring-purple-400/40"
        >
          <div className="relative p-8 md:p-10">
          <div className="mb-3 inline-flex items-center rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200">
            #1 Trending Movie
          </div>

          <h1 className="text-4xl font-extrabold md:text-6xl">{title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/80">
            {rating !== undefined && (
              <span className="inline-flex items-center gap-2">
                <span className="text-yellow-300">★</span>
                <span>{rating.toFixed(1)}</span>
              </span>
            )}
            {metaLine && <span>{metaLine}</span>}
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">
            {overview}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrimary?.();
              }}
              className="rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold"
            >
              ▶ Watch Trailer
            </button>
            {playlistPicker ? (
              <AddToPlaylistButton
                tmdbId={playlistPicker.tmdbId}
                mediaType={playlistPicker.mediaType}
                variant="full"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
              />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSecondary?.();
                }}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90"
              >
                Add to Watchlist
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
