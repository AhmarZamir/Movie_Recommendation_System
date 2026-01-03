import { http } from "../api/http.ts";
import type { Movie } from "../types/movie.types";

export async function getPopularMovies() {
  const res = await http.get<Movie[]>("/popular");
  return res.data;
}

export async function searchMovies(query: string) {
  const res = await http.get<Movie[]>(`/search/${encodeURIComponent(query)}`);
  return res.data;
}