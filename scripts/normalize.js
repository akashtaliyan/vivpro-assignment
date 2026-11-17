/**
 * Data Normalization and Reconciliation Script (Node.js)
 * Vivpro Full-Stack Take-Home Project
 * 
 * Reads:
 *   - data/songs_part1.json
 *   - data/songs_part2.json
 * 
 * Outputs:
 *   - data/songs_clean.json
 */

const fs = require('fs');
const path = require('path');

function loadColumnJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  const columns = Object.keys(data);
  
  // Find all unique row indices
  const rowIndices = Array.from(
    new Set(columns.flatMap(col => Object.keys(data[col])))
  ).sort((a, b) => Number(a) - Number(b));

  return rowIndices.map(idx => {
    const row = { _source_index: Number(idx) };
    for (const col of columns) {
      row[col] = data[col][idx] !== undefined ? data[col][idx] : null;
    }
    return row;
  });
}

function coerceFloat(val) {
  if (val === null || val === undefined || val === '' || val === 'N/A' || val === 'null') {
    return null;
  }
  const parsed = Number(val);
  return isNaN(parsed) ? null : parsed;
}

function coerceInt(val) {
  const num = coerceFloat(val);
  return num !== null ? Math.round(num) : null;
}

function cleanTitle(title) {
  if (!title) return 'Untitled';
  return String(title).trim();
}

/**
 * Detects unit mismatch in duration_ms.
 * Songs recorded with duration < 10,000 are in seconds, not milliseconds.
 */
function fixDurationMs(val) {
  const num = coerceFloat(val);
  if (num === null || num <= 0) return null;
  if (num < 10000) {
    // Value was in seconds (e.g. 158 sec -> 158,000 ms)
    return Math.round(num * 1000);
  }
  return Math.round(num);
}

function clampBoundedFeature(val, fieldName, minVal = 0.0, maxVal = 1.0) {
  if (val === null || val === undefined) return null;
  if (val < minVal) {
    console.warn(`[WARN] Field '${fieldName}' value ${val} < ${minVal}; clamping to ${minVal}`);
    return minVal;
  }
  if (val > maxVal) {
    console.warn(`[WARN] Field '${fieldName}' value ${val} > ${maxVal}; clamping to ${maxVal}`);
    return maxVal;
  }
  return Number(val.toFixed(5));
}

function normalizeRecord(row, sourceLabel) {
  let danceability = coerceFloat(row.danceability);
  let energy = coerceFloat(row.energy);
  let acousticness = coerceFloat(row.acousticness);
  let tempo = coerceFloat(row.tempo);
  let valence = coerceFloat(row.valence);
  const duration = fixDurationMs(row.duration_ms);
  const num_sections = coerceInt(row.num_sections);
  const num_segments = coerceInt(row.num_segments);
  const mood = coerceInt(row.mood);

  const title = cleanTitle(row.title);

  // Clamp audio features bounded on [0.0, 1.0]
  danceability = clampBoundedFeature(danceability, `${title}:danceability`);
  energy = clampBoundedFeature(energy, `${title}:energy`);
  acousticness = clampBoundedFeature(acousticness, `${title}:acousticness`);
  valence = valence !== null ? clampBoundedFeature(valence, `${title}:valence`) : null;

  // Tempo: 0 BPM is a placeholder sentinel; mark as null for median imputation
  if (tempo !== null && tempo <= 0) {
    console.warn(`[WARN] Song '${title}' had invalid tempo ${tempo}; marking as null for imputation`);
    tempo = null;
  } else if (tempo !== null) {
    tempo = Number(tempo.toFixed(3));
  }

  return {
    id: String(row.id).trim(),
    title,
    danceability,
    energy,
    mood,
    acousticness,
    tempo,
    duration_ms: duration,
    num_sections,
    num_segments,
    valence,
    _sources: [sourceLabel]
  };
}

function reconcile(p1Rows, p2Rows) {
  const catalog = new Map();

  for (const r of p1Rows) {
    const cleaned = normalizeRecord(r, 'part1');
    catalog.set(cleaned.id, cleaned);
  }

  for (const r of p2Rows) {
    const cleaned = normalizeRecord(r, 'part2');
    if (catalog.has(cleaned.id)) {
      const existing = catalog.get(cleaned.id);
      existing._sources.push('part2');

      // Enrich with valence if present in part2
      if (cleaned.valence !== null && existing.valence === null) {
        existing.valence = cleaned.valence;
      }

      // Check fields
      for (const field of ['danceability', 'energy', 'acousticness', 'tempo', 'duration_ms', 'num_sections', 'num_segments']) {
        if (existing[field] === null && cleaned[field] !== null) {
          existing[field] = cleaned[field];
        } else if (existing[field] !== null && cleaned[field] !== null) {
          if (Math.abs(existing[field] - cleaned[field]) > 0.0001) {
            console.log(`[INFO] Conflict resolved for '${existing.title}' on '${field}': part1=${existing[field]} vs part2=${cleaned[field]}. Keeping higher-precision part1.`);
          }
        }
      }
    } else {
      catalog.set(cleaned.id, cleaned);
    }
  }

  const finalSongs = Array.from(catalog.values());

  // Compute median tempo
  const validTempos = finalSongs.map(s => s.tempo).filter(t => t !== null).sort((a, b) => a - b);
  const medianTempo = validTempos.length > 0 ? validTempos[Math.floor(validTempos.length / 2)] : 120.0;

  // Compute mean energy
  const validEnergies = finalSongs.map(s => s.energy).filter(e => e !== null);
  const meanEnergy = validEnergies.length > 0 
    ? Number((validEnergies.reduce((a, b) => a + b, 0) / validEnergies.length).toFixed(3))
    : 0.65;

  finalSongs.forEach((song, idx) => {
    song.index = idx;
    song.is_tempo_imputed = false;
    song.is_energy_imputed = false;

    if (song.tempo === null) {
      console.log(`[INFO] Imputing tempo for '${song.title}' with median (${medianTempo} BPM)`);
      song.tempo = medianTempo;
      song.is_tempo_imputed = true;
    }

    if (song.energy === null) {
      console.log(`[INFO] Imputing energy for '${song.title}' with catalog mean (${meanEnergy})`);
      song.energy = meanEnergy;
      song.is_energy_imputed = true;
    }

    song.rating = null; // Default to unrated
  });

  return finalSongs;
}

function main() {
  const baseDir = path.resolve(__dirname, '..');
  const part1Path = path.join(baseDir, 'data', 'songs_part1.json');
  const part2Path = path.join(baseDir, 'data', 'songs_part2.json');
  const outputPath = path.join(baseDir, 'data', 'songs_clean.json');

  console.log(`Loading ${part1Path} and ${part2Path}...`);
  const p1 = loadColumnJson(part1Path);
  const p2 = loadColumnJson(part2Path);

  const cleanData = reconcile(p1, p2);
  console.log(`Successfully reconciled ${cleanData.length} unique songs.`);

  fs.writeFileSync(outputPath, JSON.stringify(cleanData, null, 2), 'utf-8');
  console.log(`Saved clean dataset to ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  loadColumnJson,
  coerceFloat,
  coerceInt,
  cleanTitle,
  fixDurationMs,
  clampBoundedFeature,
  normalizeRecord,
  reconcile
};
