/**
 * In-memory & file-backed Data Store for Songs Catalog (TypeScript)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Song,
  PaginationParams,
  PaginatedSongsResponse,
  StatsResponse,
  StatsItem
} from './types';

export class SongsStore {
  public cleanDataPath: string;
  public ratingsPath: string;
  public songs: Song[] = [];
  public ratings: Map<string, number> = new Map();

  constructor(cleanDataPath?: string, ratingsPath?: string) {
    this.cleanDataPath =
      cleanDataPath || path.resolve(__dirname, '../../data/songs_clean.json');
    this.ratingsPath =
      ratingsPath || path.resolve(__dirname, '../../data/ratings.json');
    this.load();
  }

  public load(): void {
    if (!fs.existsSync(this.cleanDataPath)) {
      throw new Error(
        `Clean dataset not found at ${this.cleanDataPath}. Run normalizer first.`
      );
    }

    const rawSongs = fs.readFileSync(this.cleanDataPath, 'utf-8');
    this.songs = JSON.parse(rawSongs);

    // Load persisted ratings if existing
    if (fs.existsSync(this.ratingsPath)) {
      try {
        const rawRatings = fs.readFileSync(this.ratingsPath, 'utf-8');
        const parsed: Record<string, number> = JSON.parse(rawRatings);
        for (const [id, stars] of Object.entries(parsed)) {
          this.ratings.set(id, stars);
        }
      } catch (err) {
        console.error('Error loading ratings file, resetting ratings map:', err);
      }
    }

    // Merge ratings into songs
    for (const song of this.songs) {
      if (this.ratings.has(song.id)) {
        song.rating = this.ratings.get(song.id)!;
      } else if (song.rating === undefined) {
        song.rating = null;
      }
    }
  }

  public saveRatings(): void {
    const obj: Record<string, number> = {};
    for (const [id, stars] of this.ratings.entries()) {
      obj[id] = stars;
    }
    fs.writeFileSync(this.ratingsPath, JSON.stringify(obj, null, 2), 'utf-8');
  }

  /**
   * Get all songs with full-dataset sorting and pagination
   */
  public getSongs({
    page = 1,
    size = 10,
    sortBy = 'title',
    order = 'asc'
  }: PaginationParams): PaginatedSongsResponse {
    const pageNum = Math.max(1, Number(page) || 1);
    const sizeNum = Math.max(1, Number(size) || 10);
    const isDesc = String(order).toLowerCase() === 'desc';

    // Sort full dataset before slicing
    const sorted = [...this.songs].sort((a: any, b: any) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      // Handle nulls: push nulls to the end
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
        return isDesc ? -cmp : cmp;
      }

      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });

    const total = sorted.length;
    const totalPages = Math.ceil(total / sizeNum) || 1;
    const start = (pageNum - 1) * sizeNum;
    const end = start + sizeNum;
    const items = sorted.slice(start, end);

    return {
      page: pageNum,
      size: sizeNum,
      total,
      total_pages: totalPages,
      items
    };
  }

  /**
   * Find songs by title (case-insensitive substring and exact matches)
   * Handles non-unique titles by returning ALL matching songs
   */
  public searchByTitle(titleQuery: string): Song[] {
    if (!titleQuery || typeof titleQuery !== 'string') {
      return [];
    }

    const normalized = titleQuery.trim().toLowerCase();
    if (!normalized) return [];

    return this.songs.filter((song) => {
      const songTitle = (song.title || '').toLowerCase();
      return songTitle.includes(normalized);
    });
  }

  /**
   * Lookup single song by ID
   */
  public getById(id: string): Song | null {
    if (!id) return null;
    return this.songs.find((s) => s.id === id) || null;
  }

  /**
   * Rate a song 1-5 stars. Persists across requests and restarts.
   */
  public rateSong(id: string, stars: number): Song | null {
    const numericStars = Number(stars);
    if (!Number.isInteger(numericStars) || numericStars < 1 || numericStars > 5) {
      throw new Error('Rating must be an integer between 1 and 5.');
    }

    const song = this.getById(id);
    if (!song) {
      return null;
    }

    song.rating = numericStars;
    this.ratings.set(id, numericStars);
    this.saveRatings();

    return song;
  }

  /**
   * Compute catalog statistics for UI charts
   */
  public getStats(): StatsResponse {
    const total = this.songs.length;
    if (total === 0) {
      return { total: 0, avg_duration_s: 0, items: [] };
    }

    const totalDurationS = this.songs.reduce(
      (acc, s) => acc + (s.duration_ms || 0) / 1000,
      0
    );
    const avgDurationS = Math.round(totalDurationS / total);

    const scatterData: StatsItem[] = this.songs.map((s) => ({
      id: s.id,
      title: s.title,
      danceability: s.danceability,
      energy: s.energy,
      tempo: s.tempo,
      duration_s: Math.round((s.duration_ms || 0) / 1000),
      valence: s.valence,
      rating: s.rating
    }));

    return {
      total,
      avg_duration_s: avgDurationS,
      items: scatterData
    };
  }
}
