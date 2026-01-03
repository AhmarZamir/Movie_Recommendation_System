import MovieCard from "../MovieCard/MovieCard";
import type { TMDBListItem } from "../../types/tmdb.types";

type Props = {
  title: string;
  movies: TMDBListItem[];
  onMovieClick?: (id: number) => void;
  rightText?: string;
  onRightClick?: () => void;
};

export default function MovieRow({ title, movies, onMovieClick, rightText, onRightClick }: Props) {
  return (
    <section className="mx-auto mt-7 max-w-6xl px-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {rightText && (
          <button onClick={onRightClick} className="text-sm text-purple-300 hover:text-purple-200">
            {rightText}
          </button>
        )}
      </div>

      <div className="no-scrollbar flex gap-5 overflow-x-auto scroll-smooth pb-3 snap-x snap-mandatory">
        {movies.map((m) => {
          const t = m.title ?? m.name ?? "Untitled";
          const sub = (m.release_date ?? m.first_air_date ?? "").slice(0, 10);
          return (
            <MovieCard
              key={m.id}
              title={t}
              posterPath={m.poster_path}
              rating={m.vote_average}
              subtitle={sub}
              onClick={() => onMovieClick?.(m.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
