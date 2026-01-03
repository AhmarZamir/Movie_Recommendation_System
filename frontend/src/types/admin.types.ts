export type AdminUserOut = {
  id: number;
  name?: string | null;
  email: string;
  role: string;
  created_at?: string | null;
  last_login?: string | null;
  is_blocked: boolean;
  is_active: boolean;
};

export type AdminMovieOut = {
  title: string;
  movie_id: number;
  genres?: string | null;
  rating?: number | null;
  overview?: string | null;
};

export type Analytics = {
  top_movies: { tmdb_id: number; media_type: number; reviews: number; avg_score: number }[];
  top_users: { user_id: number; name?: string | null; email?: string | null; reviews: number }[];
};

export type MediaTitle = {
  title?: string;
  name?: string;
};
