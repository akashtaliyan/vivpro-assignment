# Vivpro Take-Home Project: Song Catalog & Analytics (Full-Stack TypeScript)

[![TypeScript Strict](https://img.shields.io/badge/TypeScript-100%25%20Strict-blue?style=flat-square&logo=typescript)](tsconfig.json)
[![Node.js Tests](https://img.shields.io/badge/Node.js%20Tests-9%20Passing-emerald?style=flat-square)](backend/tests)
[![Vite Build](https://img.shields.io/badge/Vite-Production%20Build%20OK-blue?style=flat-square)](frontend)

A 100% full-stack TypeScript song catalog and analytics platform built for the **Vivpro Full-Stack Take-Home Assessment**. The solution ingests and reconciles messy, disagreeing column-oriented music catalog exports, serves a production-grade REST API with true full-dataset sorting, and provides an interactive React dashboard with search, persistent star ratings, and data quirk visualisations.

---

## 3–5 Sentence Tour of the Solution

1. **Reconciliation Pipeline (`scripts/normalize.ts`):** Ingests two disagreeing pipeline exports with strong TypeScript types, resolves schema conflicts (preserving higher-precision float values while enriching with new attributes like `valence`), cleans dirty strings, clamps out-of-range features ($[0.0, 1.0]$), and fixes an upstream unit mismatch where song durations were recorded in seconds instead of milliseconds.
2. **Backend API (`backend/src/`):** A strictly-typed Express.js TypeScript REST service providing full-dataset sorting, offset pagination, persistent 1–5 star ratings that survive process restarts, and case/spacing-insensitive title search designed specifically to handle real-world non-unique titles (e.g. distinct tracks titled *"Perfect"*).
3. **Frontend Dashboard (`frontend/src/`):** A modern React + TypeScript single-page application featuring sortable table columns that coordinate with the API, 10-row pagination, CSV view export, search feedback with multi-match detection, and a custom SVG chart revealing dataset quirks.
4. **Code Quality & Critique (`REVIEW.md`):** A senior-level pull request review of `review/buggy_api.py`, ranking 7 critical blockers (including pagination off-by-one errors and post-slice sorting bugs) and 4 minor nits with precise remediation code.

---

## Quick Start (Clean Machine Instructions)

### Prerequisites
* **Node.js**: v18.0.0 or higher (Node 22 recommended)
* **npm**: v9.0.0 or higher
* *(Optional)* **Python 3**: For running the alternative Python normalizer script

---

### Step 1: Run Data Normalization
Generate the clean dataset (`data/songs_clean.json`) from the raw sources:

```bash
npm run normalize
```

---

### Step 2: Start the Backend REST API
The backend runs on port `5001`.

```bash
cd backend
npm install
npm start
```

* Backend Health Check: [http://localhost:5001/health](http://localhost:5001/health)
* Songs Endpoint: [http://localhost:5001/api/songs](http://localhost:5001/api/songs)

---

### Step 3: Run the Backend Unit Tests
Runs the 9 comprehensive test suites using Node's native test runner (zero external test dependencies):

```bash
cd backend
npm test
```

---

### Step 4: Start the Frontend Dashboard
In a separate terminal window, start the React Vite dev server:

```bash
cd frontend
npm install
npm run dev
```

* Open your browser at: [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
vivpro/
├── data/
│   ├── songs_part1.json          # Raw upstream catalog export 1
│   ├── songs_part2.json          # Raw upstream catalog export 2
│   ├── songs_clean.json          # Reconciled normalized dataset
│   └── ratings.json              # Persistent star ratings storage
├── review/
│   ├── buggy_api.py              # Candidate file for AI PR review
│   └── README.md
├── scripts/
│   └── normalize.ts              # TypeScript normalization engine
├── backend/
│   ├── src/
│   │   ├── types.ts              # Centralized TypeScript domain contracts
│   │   ├── app.ts                # Express REST API routes
│   │   ├── server.ts             # Server entrypoint (port 5001)
│   │   └── store.ts              # Data store, full-dataset sort & persistence
│   ├── tests/
│   │   ├── normalization.test.ts # Normalization & unit conversion tests
│   │   └── api.test.ts           # API, sorting, search & rating tests
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── types.ts              # Frontend domain models
│   │   ├── components/
│   │   │   ├── SongTable.tsx     # Sortable table with CSV export
│   │   │   ├── SearchBar.tsx     # Multi-match title search
│   │   │   ├── Pagination.tsx    # 10 rows/page controls
│   │   │   ├── StarRating.tsx    # Interactive 1-5 star rater
│   │   │   └── QuirksChart.tsx   # SVG scatter plot & duration quirks
│   │   ├── App.tsx               # Dashboard orchestrator
│   │   ├── index.css             # Modern dark-mode styling
│   │   └── main.tsx
│   ├── index.html
│   ├── tsconfig.json
│   ├── vite.config.js
│   └── package.json
├── DECISIONS.md                  # Comprehensive decision & tradeoff log
├── REVIEW.md                     # Senior PR review of buggy_api.py
├── PROMPTS.md                    # AI collaboration & steering audit log
├── REFLECTION.md                 # 5 architectural reflection answers
├── package.json                  # Root npm workspace shortcuts
└── README.md
```

---

## API Documentation Summary

| Method | Endpoint | Query / Body | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | — | Service health check |
| `GET` | `/api/songs` | `?page=1&size=10&sort_by=tempo&order=asc` | Full-dataset sorting & pagination |
| `GET` | `/api/songs/search` | `?title=perfect` | Case-insensitive title search (handles duplicates) |
| `GET` | `/api/songs/:id` | — | Lookup single song by unique ID |
| `POST` | `/api/songs/:id/rating` | `{ "stars": 5 }` | Rate song 1–5 stars (persisted across restarts) |
| `GET` | `/api/stats` | — | Aggregated metrics & data points for charts |
