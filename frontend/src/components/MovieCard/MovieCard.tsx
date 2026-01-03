type Props = {
  title: string;
  posterPath: string | null;
  rating?: number;
  subtitle?: string;
  onClick?: () => void;
};

export default function MovieCard({ title, posterPath, rating, subtitle, onClick }: Props) {
  const posterUrl = posterPath
    ? `https://image.tmdb.org/t/p/w342${posterPath}`
    : "https://via.placeholder.com/342x513?text=No+Poster";

  const figmaScore = rating !== undefined && rating !== null ? rating.toFixed(1) : null;

  return (
    <button
      onClick={onClick}
      className="group w-[190px] flex-shrink-0 snap-start text-left"
      style={{ background: "transparent", border: "none", cursor: "pointer" }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
        <img
          src={posterUrl}
          alt={title}
          className="h-[265px] w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />

        {figmaScore !== null && (
          <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-extrabold text-yellow-300 shadow-lg shadow-black/40">
            ★ {figmaScore}
          </div>
        )}
      </div>

      <div className="mt-2 line-clamp-2 text-sm font-semibold text-white/90">{title}</div>
      {subtitle && <div className="text-xs text-white/55">{subtitle}</div>}
    </button>
  );
}
