"""
Data Normalization and Reconciliation Script for Vivpro Take-Home Project.

Reads:
  - data/songs_part1.json
  - data/songs_part2.json

Produces:
  - data/songs_clean.json

Key decisions implemented:
1. Column-oriented to row-oriented transformation.
2. Deduplication by primary key `id`.
3. Conflict resolution: Part 1 has unrounded floating precision; Part 2 has newer enriched columns (valence).
4. Unit correction: duration_ms < 10,000 detected as seconds and multiplied by 1000.
5. Value cleaning and coercion: string numbers -> float, whitespace trimmed from titles.
6. Range validation: bounds enforced [0.0, 1.0] for audio features (danceability, energy, acousticness, valence).
7. Missing/invalid values handled: 'N/A' and nulls gracefully parsed, tempo = 0 flagged and imputed.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


def load_column_json(file_path: Path) -> List[Dict[str, Any]]:
    """Convert column-oriented JSON into a list of row dictionaries."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Collect all unique row indices
    columns = list(data.keys())
    row_indices = sorted(
        list(set(idx for col in columns for idx in data[col].keys())),
        key=lambda x: int(x),
    )

    rows = []
    for idx in row_indices:
        row = {"_source_index": int(idx)}
        for col in columns:
            row[col] = data[col].get(idx, None)
        rows.append(row)
    return rows


def coerce_float(val: Any) -> Optional[float]:
    """Safely coerce value to float. Returns None if null, 'N/A', or invalid."""
    if val is None or val == "" or val == "N/A" or val == "null":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def coerce_int(val: Any) -> Optional[int]:
    """Safely coerce value to integer."""
    if val is None or val == "" or val == "N/A":
        return None
    try:
        return int(round(float(val)))
    except (ValueError, TypeError):
        return None


def clean_title(title: Any) -> str:
    """Clean and normalize title string."""
    if not title:
        return "Untitled"
    return str(title).strip()


def fix_duration_ms(val: Any) -> Optional[int]:
    """
    Detects unit mismatch in duration_ms.
    Songs with duration < 10,000 are recorded in seconds instead of milliseconds.
    """
    numeric_val = coerce_float(val)
    if numeric_val is None or numeric_val <= 0:
        return None
    if numeric_val < 10000:
        # Value is in seconds (e.g. 158 sec -> 158,000 ms)
        return int(round(numeric_val * 1000))
    return int(round(numeric_val))


def clamp_bounded_feature(val: Optional[float], field_name: str, min_val: float = 0.0, max_val: float = 1.0) -> Optional[float]:
    """
    Clamps bounded acoustic features [0.0, 1.0].
    Logs an anomaly if value was out of range.
    """
    if val is None:
        return None
    if val < min_val:
        logging.warning("Field '%s' value %s is below %s; clamping to %s", field_name, val, min_val, min_val)
        return min_val
    if val > max_val:
        logging.warning("Field '%s' value %s is above %s; clamping to %s", field_name, val, max_val, max_val)
        return max_val
    return round(val, 5)


def normalize_song_record(row: Dict[str, Any], source_label: str) -> Dict[str, Any]:
    """Cleans a single row into standard normalized representation."""
    danceability = coerce_float(row.get("danceability"))
    energy = coerce_float(row.get("energy"))
    acousticness = coerce_float(row.get("acousticness"))
    tempo = coerce_float(row.get("tempo"))
    valence = coerce_float(row.get("valence"))
    duration = fix_duration_ms(row.get("duration_ms"))
    num_sections = coerce_int(row.get("num_sections"))
    num_segments = coerce_int(row.get("num_segments"))
    mood = coerce_int(row.get("mood"))

    # Clamp audio features bounded strictly between 0.0 and 1.0
    danceability = clamp_bounded_feature(danceability, f"{row.get('title')}:danceability")
    energy = clamp_bounded_feature(energy, f"{row.get('title')}:energy")
    acousticness = clamp_bounded_feature(acousticness, f"{row.get('title')}:acousticness")
    valence = clamp_bounded_feature(valence, f"{row.get('title')}:valence") if valence is not None else None

    # Tempo: 0 is invalid for music, flag and store None (or leave for imputation)
    if tempo is not None and tempo <= 0:
        logging.warning("Song '%s' had invalid tempo %s; marking as null for imputation", row.get("title"), tempo)
        tempo = None
    elif tempo is not None:
        tempo = round(tempo, 3)

    return {
        "id": str(row["id"]).strip(),
        "title": clean_title(row.get("title")),
        "danceability": danceability,
        "energy": energy,
        "mood": mood,
        "acousticness": acousticness,
        "tempo": tempo,
        "duration_ms": duration,
        "num_sections": num_sections,
        "num_segments": num_segments,
        "valence": valence,
        "_sources": [source_label],
    }


def reconcile_datasets(p1_rows: List[Dict[str, Any]], p2_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Reconciles records from both pipelines.
    - Resolves conflicts: Part 1 provides unrounded float precision; Part 2 provides new attributes (valence).
    - Merges sources for duplicate IDs.
    """
    catalog_by_id: Dict[str, Dict[str, Any]] = {}

    # Ingest Part 1
    for r in p1_rows:
        cleaned = normalize_song_record(r, "part1")
        song_id = cleaned["id"]
        catalog_by_id[song_id] = cleaned

    # Ingest Part 2 and reconcile overlaps
    for r in p2_rows:
        cleaned = normalize_song_record(r, "part2")
        song_id = cleaned["id"]
        if song_id in catalog_by_id:
            existing = catalog_by_id[song_id]
            existing["_sources"].append("part2")
            # If valence was present in part2, enrich existing record
            if cleaned["valence"] is not None and existing["valence"] is None:
                existing["valence"] = cleaned["valence"]

            # If existing had missing fields but part 2 has them
            for field in ["danceability", "energy", "acousticness", "tempo", "duration_ms", "num_sections", "num_segments"]:
                if existing[field] is None and cleaned[field] is not None:
                    existing[field] = cleaned[field]
                elif existing[field] is not None and cleaned[field] is not None:
                    # Compare and log any discrepancies
                    if abs(existing[field] - cleaned[field]) > 0.0001:
                        logging.info(
                            "Discrepancy resolved for %s (%s) on field '%s': part1=%s vs part2=%s. Preserving higher precision part1.",
                            existing["title"],
                            song_id,
                            field,
                            existing[field],
                            cleaned[field],
                        )
        else:
            catalog_by_id[song_id] = cleaned

    # Assign clean sequential display index
    final_songs = list(catalog_by_id.values())

    # Calculate median tempo and energy for imputing sentinel nulls
    valid_tempos = [s["tempo"] for s in final_songs if s["tempo"] is not None]
    median_tempo = sorted(valid_tempos)[len(valid_tempos) // 2] if valid_tempos else 120.0

    valid_energies = [s["energy"] for s in final_songs if s["energy"] is not None]
    median_energy = round(sum(valid_energies) / len(valid_energies), 3) if valid_energies else 0.65

    for idx, s in enumerate(final_songs):
        s["index"] = idx
        # Track imputation flags
        s["is_tempo_imputed"] = False
        s["is_energy_imputed"] = False

        if s["tempo"] is None:
            logging.info("Imputing tempo for '%s' with catalog median (%s BPM)", s["title"], median_tempo)
            s["tempo"] = median_tempo
            s["is_tempo_imputed"] = True

        if s["energy"] is None:
            logging.info("Imputing energy for '%s' with catalog mean (%s)", s["title"], median_energy)
            s["energy"] = median_energy
            s["is_energy_imputed"] = True

        # Default initial rating to None (unrated)
        s["rating"] = None

    return final_songs


def main():
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / "data"

    part1_path = data_dir / "songs_part1.json"
    part2_path = data_dir / "songs_part2.json"
    output_path = data_dir / "songs_clean.json"

    logging.info("Loading %s and %s...", part1_path.name, part2_path.name)
    p1_rows = load_column_json(part1_path)
    p2_rows = load_column_json(part2_path)

    reconciled = reconcile_datasets(p1_rows, p2_rows)
    logging.info("Successfully reconciled %d unique songs.", len(reconciled))

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(reconciled, f, indent=2, ensure_ascii=False)

    logging.info("Clean dataset saved to %s", output_path)


if __name__ == "__main__":
    main()
