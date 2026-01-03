type Genre = { id: number; name: string };

type Props = {
  genres: Genre[];
  onGenreClick?: (g: Genre) => void;
};

export default function GenreRow({ genres, onGenreClick }: Props) {
  if (!genres.length) return null;

  const gradients = [
    "from-fuchsia-500/35 via-purple-500/10 to-transparent",
    "from-purple-500/35 via-sky-500/10 to-transparent",
    "from-rose-500/30 via-fuchsia-500/10 to-transparent",
    "from-amber-500/25 via-purple-500/10 to-transparent",
    "from-emerald-500/25 via-sky-500/10 to-transparent",
    "from-sky-500/25 via-purple-500/10 to-transparent",
  ];

  return (
    <section className="mx-auto mt-10 max-w-6xl px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Browse by Genre</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {genres.slice(0, 6).map((g, idx) => (
          <button
            key={g.id}
            onClick={() => onGenreClick?.(g)}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradients[idx % gradients.length]}`} />
            <div className="relative text-sm font-semibold">{g.name}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
