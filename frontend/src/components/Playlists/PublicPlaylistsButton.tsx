import { useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import type { MediaType } from "../../types/tmdb.types";

export default function PublicPlaylistsButton({
  tmdbId,
  mediaType,
}: {
  tmdbId: number;
  mediaType: MediaType;
}) {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => navigate(`/public-playlists?tmdb_id=${tmdbId}&media_type=${mediaType}`)}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
        title="More"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
