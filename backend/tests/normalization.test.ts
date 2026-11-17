import test from 'node:test';
import assert from 'node:assert';
import {
  coerceFloat,
  coerceInt,
  cleanTitle,
  fixDurationMs,
  clampBoundedFeature,
  normalizeRecord,
  reconcile
} from '../../scripts/normalize';

test('Normalization: Unit correction in duration_ms', () => {
  // Values under 10,000 are in seconds and must be converted to milliseconds
  assert.strictEqual(fixDurationMs(158), 158000);
  assert.strictEqual(fixDurationMs('270'), 270000);
  assert.strictEqual(fixDurationMs(356), 356000);

  // Normal millisecond values should remain unchanged
  assert.strictEqual(fixDurationMs(225947), 225947);
  assert.strictEqual(fixDurationMs(0), null);
  assert.strictEqual(fixDurationMs(null), null);
});

test('Normalization: String coercion and whitespace cleaning', () => {
  assert.strictEqual(coerceFloat('0.521'), 0.521);
  assert.strictEqual(coerceFloat('108.73'), 108.73);
  assert.strictEqual(coerceFloat('N/A'), null);
  assert.strictEqual(coerceFloat(null), null);

  assert.strictEqual(cleanTitle('  4 walls   '), '4 walls');
  assert.strictEqual(cleanTitle(''), 'Untitled');
});

test('Normalization: Bounded feature clamping [0.0, 1.0]', () => {
  // Out of range danceability > 1.0 clamped to 1.0
  assert.strictEqual(clampBoundedFeature(1.42, 'danceability'), 1.0);
  // Negative acousticness < 0.0 clamped to 0.0
  assert.strictEqual(clampBoundedFeature(-0.05, 'acousticness'), 0.0);
  // Valid value preserved
  assert.strictEqual(clampBoundedFeature(0.75, 'energy'), 0.75);
});

test('Normalization: Sentinel tempo 0 handled', () => {
  const dirtyRow = {
    id: 'test_id',
    title: 'Test Song',
    tempo: 0,
    danceability: 0.5
  };
  const cleaned = normalizeRecord(dirtyRow, 'test_source');
  assert.strictEqual(cleaned.tempo, null, 'Tempo 0 should be normalized to null for imputation');
});

test('Normalization: Conflict resolution between Part 1 and Part 2', () => {
  const p1 = [{
    id: 'shared_id',
    title: 'Shared Song',
    danceability: 0.727,
    duration_ms: 200000
  }];
  const p2 = [{
    id: 'shared_id',
    title: 'Shared Song',
    danceability: 0.74,
    duration_ms: 200000,
    valence: 0.45
  }];

  const reconciled = reconcile(p1, p2);
  assert.strictEqual(reconciled.length, 1);
  const song = reconciled[0];
  // Preserves higher precision 0.727 from Part 1
  assert.strictEqual(song.danceability, 0.727);
  // Enriches with valence from Part 2
  assert.strictEqual(song.valence, 0.45);
  // Verifies provenance tracking
  assert.deepStrictEqual(song._sources, ['part1', 'part2']);
});
