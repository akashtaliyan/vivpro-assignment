# Architectural & Data Reconciliation Decisions (`DECISIONS.md`)

This document records the foundational technical and data decisions made during the Vivpro Full-Stack Take-Home project.

---

## 1. Data Normalization & Reconciliation Decisions (Section 1)

The upstream catalog exports (`songs_part1.json` and `songs_part2.json`) contain column-oriented data produced by different pipelines at different times. Below is our defensible resolution strategy:

### A. Deduplication & Conflict Resolution
* **Primary Key Definition:** Track `id` is the invariant unique identifier. Row indices in the exports are pipeline artifacts and are not stable identifiers across exports.
* **Overlap:** 4 tracks overlap between Part 1 and Part 2:
  * `2takcwOaAZWiXQijPHIx7B` (*Naïve*)
  * `4uLU6hMCjMI75M1A2tKUQC` (*Never Gonna Give You Up*)
  * `6DCZcSspjsKoFjzjrWoCEA` (*God's Plan*)
  * `7qiZfU4dY1lWllzX7mPBI3` (*Shape of You*)
* **Conflict on `Never Gonna Give You Up` (Danceability):**
  * Part 1 specifies `0.727` (3 decimal places precision).
  * Part 2 specifies `0.74` (rounded to 2 decimal places).
  * **Decision:** We preserve `0.727` from Part 1 because it retains unrounded high-precision floating point measurements. 
  * **Enrichment:** Part 2 includes an extra downstream attribute `valence` (`0.44`). We merge `valence` into the record and track provenance via `_sources: ["part1", "part2"]`.

### B. Unit Mismatch Bug (`duration_ms`)
* **Detection:** In Part 2, three tracks had durations recorded as `158`, `270`, and `356`. For standard commercial tracks (*Sunflower*, *Uptown Funk*, *Sweet Child O Mine*), durations under 10 seconds (10,000 ms) are impossible. These values are in **seconds**, not milliseconds.
* **Resolution:** Heuristic rule: Any `duration_ms > 0 and duration_ms < 10000` is converted to milliseconds by multiplying by `1000`:
  * *Sunflower*: `158` sec → `158,000` ms (2m 38s)
  * *Uptown Funk*: `270` sec → `270,000` ms (4m 30s)
  * *Sweet Child O Mine*: `356` sec → `356,000` ms (5m 56s)

### C. Out-of-Range & Invalid Audio Features
* **Bounded Features [0.0, 1.0]:**
  * *21 Guns* had `danceability = 1.42`. Standard audio feature models (Spotify/EchoNest) define danceability strictly on $[0.0, 1.0]$. Values $> 1.0$ indicate model artifacting or improper normalization. We clamp to `1.0` and annotate it in the UI/data flags.
  * *Another Brick* had `acousticness = -0.05`. Negative acousticness is physically meaningless. We clamp to `0.00`.
* **Sentinel Values & Imputation:**
  * *Blinding Lights* had `tempo = 0`. Tempo 0 is impossible for music; 0 was used as an unmeasured sentinel. We impute with the catalog median (`117.046 BPM`) and set `is_tempo_imputed: true`.
  * *11:11* omitted the `energy` key entirely; *Yesterday* had `energy = "N/A"`. Both are coerced to null and imputed with the catalog mean (`0.65`), setting `is_energy_imputed: true`.
* **Type Coercion & Whitespace:**
  * String numbers (`"0.521"`, `"108.73"`) are coerced to standard IEEE floats.
  * Titles with leading/trailing whitespace (`" 4 walls  "`) are stripped to `"4 walls"`.

### D. The Extra Attribute (`valence`)
* `valence` appears only in Part 2. Rather than dropping this valuable musical mood feature or rejecting Part 1 records, `valence` is treated as a nullable float (`Optional[float]`). Tracks originating solely from Part 1 have `valence: null`.

---

## 2. Architecture & API Contract Decisions (Section 2)

### A. Stack Choice: Node.js (Express) + React (Vite)
* **Language Flexibility:** The prompt states: *"Backend: Python strongly preferred. If Python isn't your language, use what you're strongest in and document how to run it."*
* **Reasoning:** Utilizing Node.js across both backend and frontend provides a unified JavaScript/TypeScript developer experience, avoids Python version/virtualenv conflicts on evaluation machines, and provides instant test execution via Node 22's native `node:test` runner.
* **Bonus Dual Scripting:** We provided both `scripts/normalize.js` and `scripts/normalize.py` so reviewers can run the pipeline in either environment.

### B. Title Search Contract & Non-Unique Title Handling
* **The Reality:** Song titles are not unique. For example, two completely distinct songs in the catalog are titled *"Perfect"* (one by Ed Sheeran ID `0tgVpDi06FyKpA1z0VMD4v`, another recording ID `7dNsHhGeGU5MV01r06O8gK`).
* **API Design:**
  * Endpoint: `GET /api/songs/search?title=<query>`
  * Response: `{ query: string, count: number, matches: Song[] }`
  * Returning an array of matches allows the UI to render all matching songs and avoids ambiguous collisions.
  * Case-insensitive and whitespace-trimmed matching ensures search queries like `"perfect"` or `" 3am "` succeed seamlessly.

### C. Full-Dataset Sorting
* Sorting is applied to the **entire dataset before pagination slicing**.
* Slicing formula: `start = (page - 1) * size` and `end = start + size`.
* Null values are stably sorted to the end in ascending order.

### D. Star Rating Persistence
* Endpoint: `POST /api/songs/:id/rating`
* Keyed strictly by unique song `id` (never by title).
* Inputs are strictly validated: must be an integer between 1 and 5.
* Ratings are stored in memory and persisted to `data/ratings.json`, surviving server restarts.

---

## 3. What Was Deliberately Left Out & Future Roadmap

### Deliberately Left Out (Budgeting ~3 Hours):
1. **Full PostgreSQL / Docker Compose Setup:** Using an embedded file-backed store avoids external daemon dependencies, ensuring reviewers can clone and run immediately with zero setup hurdles.
2. **User Authentication & Authorization:** Ratings are currently global rather than scoped to authenticated user IDs.
3. **Fuzzy Levenshtein Search Engine:** Substring matching was implemented instead of complex fuzzy indexing to avoid third-party dependencies while still solving case/spacing requirements.

### What We Would Do With More Time:
1. **Production Pipeline:** Move the normalization script into an automated pipeline (e.g., Apache Airflow or Prefect) with Great Expectations schema validations.
2. **Database:** Migrate to PostgreSQL with Prisma ORM, implementing full-text search indexing (`tsvector`) for multi-attribute music catalog querying.
3. **E2E Testing:** Add Playwright integration tests testing table sorting, pagination, and rating flows end-to-end.
