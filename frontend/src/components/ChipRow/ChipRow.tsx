type Props = {
  title: string;
  chips: string[];
  rightText?: string;
  onRightClick?: () => void;
  onChipClick?: (chip: string) => void;
};

export default function ChipRow({ title, chips, rightText, onRightClick, onChipClick }: Props) {
  if (!chips.length) return null;

  return (
    <section className="mx-auto mt-6 max-w-6xl px-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">{title}</h3>
        {rightText && (
          <button onClick={onRightClick} className="text-xs text-white/45 hover:text-white/70">
            {rightText}
          </button>
        )}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => onChipClick?.(c)}
            className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}
