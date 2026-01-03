type Props = {
  message: string;
  onClose?: () => void;
};

export default function Toast({ message, onClose }: Props) {
  return (
    <div
      role="status"
      className="fixed left-1/2 top-6 z-[9999] -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 px-4 py-3 text-sm text-white shadow-[0_18px_55px_rgba(0,0,0,0.55)]"
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-white/70 hover:text-white"
            aria-label="Dismiss"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
