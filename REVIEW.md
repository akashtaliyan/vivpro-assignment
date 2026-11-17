# Pull Request Review: `review/buggy_api.py`

**Reviewer:** Akash Taliyan (Full-Stack Engineer)  
**PR Description:** Initial implementation of Songs REST API (generated via AI coding assistant)  
**Status:** **REQUEST CHANGES (BLOCKED)** ❌

---

## Executive Summary

While the generated API starts and serves basic requests, it contains **7 critical blockers** that violate basic functional requirements, corrupt catalog sorting, cause silent data loss, and break HTTP REST standards. 

AI code generators often produce syntactically valid code that satisfies surface-level prompts while failing foundational edge cases (e.g., sorting *after* pagination slicing, 1-based indexing offsets, and keying entities by non-unique human titles).

Below is the structured critique and ranking.

---

## Severity Ranking Overview

| Rank | Issue | Severity | Location |
| :--- | :--- | :--- | :--- |
| **1** | Sorting applied *after* pagination slicing | **BLOCKER** | L37-39 |
| **2** | 1-based page offset bug skips first 10 items | **BLOCKER** | L35-36 |
| **3** | Rating & lookup keyed by non-unique `title` | **BLOCKER** | L43-62 |
| **4** | Star rating lacks bounds & type validation | **BLOCKER** | L55-62 |
| **5** | Unhandled `KeyError` on arbitrary `sort_by` | **BLOCKER** | L39 |
| **6** | HTTP 200 returned on entity not found | **BLOCKER** | L49 |
| **7** | Ephemeral in-memory state & data loss | **BLOCKER** | L52, L57-62 |
| **8** | Mutable default argument `_cache=[]` | **NIT** | L21 |
| **9** | Unhandled `ZeroDivisionError` on empty dataset | **NIT** | L71 |
| **10** | Rigid case-sensitive exact title match | **NIT** | L47 |
| **11** | Missing CORS middleware | **NIT** | L18 |

---

## Detailed Findings

### 1. [BLOCKER] Sorting applied AFTER pagination slicing
* **What is wrong:** `page_items = songs[start:end]` is executed **before** `sorted(page_items, key=...)`.
* **Impact:** The API only sorts the 10 sliced songs of the requested page, rather than sorting the global catalog. A user requesting `?sort_by=tempo&order=asc` on page 1 will **not** receive the slowest songs in the catalog; they will only see page 1's arbitrary 10 songs sorted amongst themselves.
* **How to fix:**
  ```python
  # Sort the entire dataset before slicing:
  reverse = (order.lower() == "desc")
  sorted_songs = sorted(songs, key=lambda s: (s.get(sort_by) is None, s.get(sort_by)), reverse=reverse)
  page_items = sorted_songs[start:end]
  ```

---

### 2. [BLOCKER] 1-based page offset math skips first 10 items
* **What is wrong:** `start = page * size` with default `page = 1, size = 10` evaluates to `start = 10, end = 20`.
* **Impact:** Anyone calling `GET /songs` with default parameters never sees the first 10 songs (indices 0–9). Page 1 returns Page 2 items.
* **How to fix:**
  ```python
  # Correct 1-based pagination formula:
  start = (page - 1) * size
  end = start + size
  ```

---

### 3. [BLOCKER] Rating & lookup keyed by non-unique `title`
* **What is wrong:** `@app.get("/songs/{title}")` and `@app.post("/songs/{title}/rating")` treat song titles as unique primary keys.
* **Impact:** In real-world music catalogs (and specifically in this dataset), different songs share identical titles (e.g., two distinct tracks titled *"Perfect"* with different IDs and durations). Looking up by title always shadows and hides subsequent tracks. Rating by title overwrites all tracks sharing that title.
* **How to fix:**
  * Route single-song lookup and rating by unique primary key: `GET /songs/{id}` and `POST /songs/{id}/rating`.
  * Support title querying via a dedicated search endpoint returning an array of matches: `GET /songs/search?title=...`.

---

### 4. [BLOCKER] Star rating lacks bounds and type validation
* **What is wrong:** `rate_song(title: str, stars: int)` performs no validation on the `stars` parameter.
* **Impact:** Clients can pass negative values (`stars = -5`), zero, or extreme numbers (`stars = 99999`), corrupting rating calculations and breaking frontend UI components.
* **How to fix:**
  ```python
  from fastapi import HTTPException

  if not (1 <= stars <= 5):
      raise HTTPException(status_code=400, detail="Rating must be an integer between 1 and 5.")
  ```

---

### 5. [BLOCKER] Unhandled `KeyError` on arbitrary `sort_by`
* **What is wrong:** `key=lambda s: s[sort_by]` accesses the dictionary key directly without validation or safe retrieval.
* **Impact:** If a user passes an invalid or nonexistent column (e.g. `?sort_by=artist`), Python raises an unhandled `KeyError`, crashing the request with an HTTP 500 Internal Server Error.
* **How to fix:** Validate `sort_by` against a whitelist of valid schema fields before executing sort. If invalid, return HTTP 400 Bad Request.

---

### 6. [BLOCKER] HTTP 200 returned on entity not found
* **What is wrong:** `return {"error": "not found"}` returns an HTTP 200 OK status code.
* **Impact:** Violates standard REST semantics. Client SDKs, frontend interceptors, and monitoring tools rely on HTTP 404 to detect missing resources. A 200 status code masks failures as successful operations.
* **How to fix:**
  ```python
  from fastapi import HTTPException
  raise HTTPException(status_code=404, detail="Song not found")
  ```

---

### 7. [BLOCKER] Ephemeral in-memory state & process data loss
* **What is wrong:** `ratings = {}` is stored in a module-level dictionary in RAM and mutated directly on in-memory lists.
* **Impact:** Any server restart, redeployment, or auto-scaling worker destroys all user ratings. Concurrent async requests can experience race conditions without database locks.
* **How to fix:** Persist ratings to a SQLite database or a persistent file storage with atomic writes.

---

## Non-Blocking Suggestions (Nits)

### 8. [NIT] Mutable default argument anti-pattern
* **What is wrong:** `def load_songs(_cache=[]):` uses a mutable list default argument.
* **Impact:** This is a Python anti-pattern. While often used as a quick hack for caching, it introduces hidden state leaks across unit test runs and prevents clean reload operations.
* **How to fix:** Use an explicit singleton instance, `@functools.lru_cache`, or application state dependency (`app.state.songs`).

### 9. [NIT] Unhandled `ZeroDivisionError` on empty dataset
* **What is wrong:** `avg_seconds = total / len(songs)` will divide by zero if `songs.json` is empty.
* **Impact:** HTTP 500 crash if called on a fresh catalog or empty dataset.
* **How to fix:** Guard with `if not songs: return {"avg_seconds": 0.0}`.

### 10. [NIT] Rigid case-sensitive and whitespace title search
* **What is wrong:** `song["title"] == title` requires exact character and whitespace match.
* **Impact:** A search for `"perfect"` or `" 4 walls "` fails because of case or leading whitespace.
* **How to fix:** Compare using trimmed lowercasing: `song["title"].strip().lower() == title.strip().lower()`.

### 11. [NIT] Missing CORS middleware
* **What is wrong:** No `CORSMiddleware` configured.
* **Impact:** Single-page frontend applications hosted on separate origins (e.g. Vite on port 3000) will be blocked by browser CORS policy.
* **How to fix:** Add `app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)`
