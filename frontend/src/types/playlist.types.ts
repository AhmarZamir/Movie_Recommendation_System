import type { MediaType } from "./tmdb.types";

export type PlaylistOut = {
  id: number;
  name: string;
  is_public: boolean;
  items_count: number;
  created_at?: string;
  updated_at?: string;
};

export type PlaylistItem = {
  id: number;
  tmdb_id: number;
  media_type: MediaType;
  title?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  vote_average?: number | string | null;
};

export type PlaylistDetail = {
  id: number;
  name: string;
  is_public: boolean;
  items: PlaylistItem[];
};

export type PublicPlaylistOut = {
  id: number;
  name: string;
  user_id: number;
  user_name?: string | null;
  items_count: number;
  updated_at: string;
};

export type PublicPlaylistDetail = {
  id: number;
  name: string;
  user_id: number;
  user_name?: string | null;
  items: PlaylistItem[];
};
