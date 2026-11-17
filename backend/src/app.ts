/**
 * Express Application & REST API Endpoints (TypeScript)
 */

import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import { SongsStore } from './store';
import { Song, RatingResponse, SearchResponse } from './types';

export function createApp(storeInstance?: SongsStore): Application {
  const app: Application = express();
  const store = storeInstance || new SongsStore();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * 1. [Must have] Return all items. Support pagination (page + size)
   * 3. [Must have] Sorting by any attribute, ascending/descending,
   *    applied across the whole dataset (not just one page).
   */
  app.get('/api/songs', (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const size = parseInt(req.query.size as string, 10) || 10;
    const sortBy = (req.query.sort_by as string) || 'title';
    const order = ((req.query.order as string) || 'asc').toLowerCase() as 'asc' | 'desc';

    const allowedSortFields: Array<keyof Song | 'index'> = [
      'id',
      'title',
      'danceability',
      'energy',
      'mood',
      'acousticness',
      'tempo',
      'duration_ms',
      'num_sections',
      'num_segments',
      'valence',
      'rating',
      'index'
    ];

    if (!allowedSortFields.includes(sortBy as any)) {
      return res.status(400).json({
        error: `Invalid sort field '${sortBy}'. Allowed fields: ${allowedSortFields.join(', ')}`
      });
    }

    const result = store.getSongs({
      page,
      size,
      sortBy,
      order
    });

    return res.json(result);
  });

  /**
   * 2. [Must have] Given a title, return that song's attributes.
   *    Handles non-unique titles (e.g. "Perfect") and case/spacing insensitivity.
   */
  app.get('/api/songs/search', (req: Request, res: Response) => {
    const title = req.query.title;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: "Query parameter 'title' is required." });
    }

    const matches = store.searchByTitle(title);
    const response: SearchResponse = {
      query: title.trim(),
      count: matches.length,
      matches
    };
    return res.json(response);
  });

  /**
   * Lookup single song by ID
   */
  app.get('/api/songs/:id', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const song = store.getById(id);
    if (!song) {
      return res.status(404).json({ error: `Song with ID '${id}' not found.` });
    }
    return res.json(song);
  });

  /**
   * 4. [Should have] Let a user rate a song 1–5 stars. Persists across requests.
   *    Validates bounds, types, and existence.
   */
  app.post('/api/songs/:id/rating', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { stars } = req.body;

    if (stars === undefined || stars === null) {
      return res.status(400).json({ error: "Missing required body field 'stars'." });
    }

    const parsedStars = Number(stars);
    if (!Number.isInteger(parsedStars) || parsedStars < 1 || parsedStars > 5) {
      return res.status(400).json({
        error: "Invalid rating. 'stars' must be an integer between 1 and 5."
      });
    }

    try {
      const updated = store.rateSong(id, parsedStars);
      if (!updated) {
        return res.status(404).json({ error: `Song with ID '${id}' not found.` });
      }
      const response: RatingResponse = {
        message: 'Rating recorded successfully',
        id: updated.id,
        title: updated.title,
        rating: updated.rating!
      };
      return res.json(response);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * Catalog statistics for visual charts
   */
  app.get('/api/stats', (_req: Request, res: Response) => {
    return res.json(store.getStats());
  });

  return app;
}
