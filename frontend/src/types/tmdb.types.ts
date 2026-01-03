export type MediaType = "movie" | "tv";

export type TMDBGenre = {
  id: number;
  name: string;
};

export type TMDBListItem = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  popularity?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  genre_ids?: number[];
};

export type TMDBPaged<T> = {
  page: number;
  results: T[];
  total_pages?: number;
  total_results?: number;
};

export type TMDBMedia = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  episode_run_time?: number[];
  status?: string;
  original_language?: string;
  tagline?: string;
  genres?: TMDBGenre[];
  credits?: { cast?: any[]; crew?: any[] };
  created_by?: { id: number; name: string }[];
};
