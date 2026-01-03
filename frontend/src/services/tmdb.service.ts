import {http} from "../api/http.ts";

export async function getTrendingMovies() {
  const res = await http.get("/tmdb/trending");
  return res.data;
}

export async function getNowPlayingMovies() {
  const res = await http.get("/tmdb/now_playing");
  return res.data;
}

export async function getGenres() {
  const res = await http.get("/tmdb/genre/list");
  return res.data;
}

export async function searchMovies(query: string) {
  const res = await http.get("/tmdb/search", { params: { query } });
  return res.data;
}

export async function getMovieDetails(tmdbId: number) {
  const res = await http.get(`/tmdb/movie/${tmdbId}`);
  return res.data;
}

