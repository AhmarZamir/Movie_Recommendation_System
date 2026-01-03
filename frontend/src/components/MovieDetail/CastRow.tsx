type Cast = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
};

type Props = {
  title?: string;
  cast: Cast[];
};

export default function CastRow({ title = "Top Cast", cast }: Props) {
  const img = (p: string | null | undefined) =>
    p ? `https://image.tmdb.org/t/p/w185${p}` : "https://via.placeholder.com/185x278?text=No+Photo";

  return (
    <section className="mx-auto mt-7 max-w-6xl px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>

      <div className="no-scrollbar flex gap-5 overflow-x-auto scroll-smooth pb-3 snap-x snap-mandatory">
        {cast.slice(0, 12).map((p) => (
          <div key={p.id} className="w-[170px] flex-shrink-0 snap-start">
            <div className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
              <img src={img(p.profile_path)} alt={p.name} className="h-[240px] w-full object-cover" />
            </div>
            <div className="mt-2 line-clamp-1 text-sm font-semibold text-white/90">{p.name}</div>
            <div className="line-clamp-1 text-xs text-white/55">{p.character ?? ""}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
