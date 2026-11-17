import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { SongsStore } from '../src/store';
import { Song } from '../src/types';

// Mock data setup
const mockSongs: Song[] = [
  { index: 0, id: 'song_1', title: 'Alpha Song', tempo: 130, duration_ms: 200000, rating: null, danceability: 0.5, energy: 0.6, mood: 1, acousticness: 0.1, num_sections: 8, num_segments: 800, valence: 0.5, _sources: ['mock'] },
  { index: 1, id: 'song_2', title: 'Beta Song', tempo: 90, duration_ms: 180000, rating: null, danceability: 0.6, energy: 0.7, mood: 0, acousticness: 0.2, num_sections: 7, num_segments: 700, valence: 0.4, _sources: ['mock'] },
  { index: 2, id: 'song_3', title: 'Gamma Song', tempo: 110, duration_ms: 300000, rating: null, danceability: 0.7, energy: 0.8, mood: 1, acousticness: 0.3, num_sections: 9, num_segments: 900, valence: 0.6, _sources: ['mock'] },
  { index: 3, id: 'song_4', title: 'Delta Song', tempo: 150, duration_ms: 120000, rating: null, danceability: 0.8, energy: 0.9, mood: 0, acousticness: 0.4, num_sections: 10, num_segments: 1000, valence: 0.7, _sources: ['mock'] },
  { index: 4, id: 'song_5', title: 'Perfect', tempo: 95, duration_ms: 260000, rating: null, danceability: 0.59, energy: 0.45, mood: 1, acousticness: 0.16, num_sections: 9, num_segments: 940, valence: 0.61, _sources: ['mock'] },
  { index: 5, id: 'song_6', title: 'Perfect', tempo: 96, duration_ms: 265000, rating: null, danceability: 0.60, energy: 0.46, mood: 1, acousticness: 0.17, num_sections: 9, num_segments: 944, valence: 0.60, _sources: ['mock'] }, // Duplicate title!
  { index: 6, id: 'song_7', title: 'Zeta Song', tempo: 80, duration_ms: 210000, rating: null, danceability: 0.4, energy: 0.5, mood: 0, acousticness: 0.5, num_sections: 6, num_segments: 600, valence: 0.3, _sources: ['mock'] }
];

test('Store & API: Pagination starts at index 0 and calculates total pages', () => {
  const store = Object.create(SongsStore.prototype) as SongsStore;
  store.songs = [...mockSongs];
  store.ratings = new Map();

  const page1 = store.getSongs({ page: 1, size: 3 });
  assert.strictEqual(page1.page, 1);
  assert.strictEqual(page1.size, 3);
  assert.strictEqual(page1.total, 7);
  assert.strictEqual(page1.total_pages, 3);
  assert.strictEqual(page1.items.length, 3);

  const page2 = store.getSongs({ page: 2, size: 3 });
  assert.strictEqual(page2.items.length, 3);
  // Ensure page 1 and page 2 items are distinct
  assert.notStrictEqual(page1.items[0].id, page2.items[0].id);

  const page3 = store.getSongs({ page: 3, size: 3 });
  assert.strictEqual(page3.items.length, 1);
});

test('Store & API: Sorting applies to the WHOLE dataset, not just one page', () => {
  const store = Object.create(SongsStore.prototype) as SongsStore;
  store.songs = [...mockSongs];
  store.ratings = new Map();

  // Sort ascending by tempo across all 7 items, page size 3
  const sortedAscPage1 = store.getSongs({ page: 1, size: 3, sortBy: 'tempo', order: 'asc' });
  assert.strictEqual(sortedAscPage1.items[0].title, 'Zeta Song');
  assert.strictEqual(sortedAscPage1.items[0].tempo, 80);
  assert.strictEqual(sortedAscPage1.items[1].title, 'Beta Song');
  assert.strictEqual(sortedAscPage1.items[1].tempo, 90);

  // Sort descending by tempo across all 7 items, page size 3
  const sortedDescPage1 = store.getSongs({ page: 1, size: 3, sortBy: 'tempo', order: 'desc' });
  assert.strictEqual(sortedDescPage1.items[0].title, 'Delta Song');
  assert.strictEqual(sortedDescPage1.items[0].tempo, 150);
  assert.strictEqual(sortedDescPage1.items[1].title, 'Alpha Song');
  assert.strictEqual(sortedDescPage1.items[1].tempo, 130);
});

test('Store & API: Title search handles case, spacing, and NON-UNIQUE titles', () => {
  const store = Object.create(SongsStore.prototype) as SongsStore;
  store.songs = [...mockSongs];
  store.ratings = new Map();

  // Case and whitespace insensitive search
  const resultsCase = store.searchByTitle('  alPHa  ');
  assert.strictEqual(resultsCase.length, 1);
  assert.strictEqual(resultsCase[0].id, 'song_1');

  // Non-unique title search: "Perfect" must return BOTH songs
  const perfectMatches = store.searchByTitle('perfect');
  assert.strictEqual(perfectMatches.length, 2);
  const matchedIds = perfectMatches.map((s) => s.id);
  assert.ok(matchedIds.includes('song_5'));
  assert.ok(matchedIds.includes('song_6'));

  // Non-matching query returns empty array gracefully
  const noMatches = store.searchByTitle('NonExistentTitleXYZ');
  assert.strictEqual(noMatches.length, 0);
});

test('Store & API: Star rating validation & bounds [1-5]', () => {
  const testRatingsFile = path.resolve(__dirname, 'test_ratings.tmp.json');
  const store = Object.create(SongsStore.prototype) as SongsStore;
  store.songs = JSON.parse(JSON.stringify(mockSongs));
  store.ratings = new Map();
  store.ratingsPath = testRatingsFile;
  store.saveRatings = () => {}; // mock save

  // Valid rating
  const rated = store.rateSong('song_1', 5);
  assert.ok(rated);
  assert.strictEqual(rated.rating, 5);
  assert.strictEqual(store.getById('song_1')?.rating, 5);

  // Invalid: out of bounds (< 1)
  assert.throws(() => store.rateSong('song_1', 0), /between 1 and 5/);
  // Invalid: out of bounds (> 5)
  assert.throws(() => store.rateSong('song_1', 6), /between 1 and 5/);
  // Invalid: float
  assert.throws(() => store.rateSong('song_1', 4.5), /between 1 and 5/);

  // Non-existent song ID returns null
  const notFound = store.rateSong('non_existent_id', 4);
  assert.strictEqual(notFound, null);
});
