export interface Song {
  index: number;
  id: string;
  title: string;
  danceability: number | null;
  energy: number | null;
  mood: number | null;
  acousticness: number | null;
  tempo: number | null;
  duration_ms: number | null;
  num_sections: number | null;
  num_segments: number | null;
  valence: number | null;
  rating: number | null;
  _sources: string[];
  is_tempo_imputed?: boolean;
  is_energy_imputed?: boolean;
}

export interface PaginatedSongsResponse {
  page: number;
  size: number;
  total: number;
  total_pages: number;
  items: Song[];
}

export interface SearchResponse {
  query: string;
  count: number;
  matches: Song[];
}

export interface StatsItem {
  id: string;
  title: string;
  danceability: number | null;
  energy: number | null;
  tempo: number | null;
  duration_s: number;
  valence: number | null;
  rating: number | null;
}

export interface StatsResponse {
  total: number;
  avg_duration_s: number;
  items: StatsItem[];
}
