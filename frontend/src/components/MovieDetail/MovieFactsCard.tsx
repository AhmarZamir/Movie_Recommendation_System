type Props = {
  releaseDate?: string;
  runtime?: number;
  status?: string;
  language?: string;
  genres?: { id: number; name: string }[];
  director?: string;
};

function minsToText(mins?: number) {
  if (!mins) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function MovieFactsCard({
  releaseDate,
  runtime,
  status,
  language,
  genres,
  director,
}: Props) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="text-sm font-extrabold text-white/90">Need to know</div>

      <div className="mt-4 space-y-3 text-xs text-white/70">
        <Row k="Director" v={director ?? "-"} />
        <Row k="Release" v={releaseDate ?? "-"} />
        <Row k="Runtime" v={minsToText(runtime)} />
        <Row k="Status" v={status ?? "-"} />
        <Row k="Language" v={language ? language.toUpperCase() : "-"} />
        <Row
          k="Genres"
          v={genres?.length ? genres.slice(0, 4).map((g) => g.name).join(", ") : "-"}
        />
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-white/45">{k}</span>
      <span className="text-right text-white/85">{v}</span>
    </div>
  );
}
