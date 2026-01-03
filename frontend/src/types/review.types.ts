export type RatingBreakdown = {
  tmdb_id: number;
  media_type: number;
  avg_score: number;
  count: number;
  breakdown: Record<number, number>;
};

export type ReviewOut = {
  id: number;
  content: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: number;
  user_name?: string | null;
  upvotes?: number;
  downvotes?: number;
  user_score?: number;
  tmdb_id?: number;
  media_type?: number;
};
