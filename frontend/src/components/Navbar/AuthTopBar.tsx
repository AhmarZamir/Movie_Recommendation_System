import { Link } from "react-router-dom";

export default function AuthTopbar() {
  return (
    <header className="w-full border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Left: Brand -> goes Home */}
        <Link to="/home" className="flex items-center gap-2 font-extrabold text-white/90 hover:text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-400" />
          <span className="tracking-tight">Cinematic AI</span>
        </Link>

        {/* Right: Home icon button */}
        <Link
          to="/home"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:text-white hover:border-white/20"
          aria-label="Back to Home"
          title="Back to Home"
        >
          {/* Home icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">Home</span>
        </Link>
      </div>
    </header>
  );
}
