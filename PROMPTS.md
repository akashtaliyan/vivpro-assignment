# AI Collaboration Log (`PROMPTS.md`)

This log documents the interaction sequence, prompt steering, turning points, and oversight applied while developing the Vivpro Take-Home Project with the AI assistant.

---

## Prompt Sequence & Steering Annotations

### Prompt 1: Initial Discovery & Email Retrieval
> **User Prompt:** `"check the email from vivpro for assignment"`

* **Intent:** Retrieve the take-home assignment specification, deadline, and source files from the candidate's inbox.
* **What Went Well:** The AI located the email from Holly Machain, extracted the calendar invite details (Wednesday, Nov 18, 4:30 PM IST), and downloaded the attachments (`TAKE_HOME.pdf`, `data.zip`, `review.zip`).
* **Turning Point / Correction:** The AI initially called an unapproved MCP tool which required permission. The system transitioned to the official `gmail` CLI, safely downloaded all assets, extracted them into the workspace, and verified directory contents.

---

### Prompt 2: Assignment Clarification & Scope Assessment
> **User Prompt:** `"first explain me about the what is the ask what is this assignment is about"`

* **Intent:** Understand the philosophy, grading rubric, hidden traps, and expected deliverables before writing code.
* **What Went Well:** The AI performed an exploratory scan across `data/songs_part1.json`, `data/songs_part2.json`, and `review/buggy_api.py`.
* **Key Traps Uncovered & Analyzed:**
  1. *Unit Mismatch Trap:* In Part 2, durations for songs like *Sunflower* (`158`), *Uptown Funk* (`270`), and *Sweet Child O Mine* (`356`) were in seconds, not milliseconds.
  2. *Sorting Trap:* `buggy_api.py` sliced pagination before sorting (`page_items = songs[start:end]` then `sorted(...)`), which breaks global dataset sorting.
  3. *Non-Unique Titles:* Two distinct songs titled *"Perfect"* exist in Part 2.
  4. *Out of Range Audio Features:* `21 Guns` danceability is 1.42 (exceeds 1.0); `Another Brick` acousticness is -0.05.
* **Steering:** The candidate directed the AI to structure the deliverables cleanly across 6 sections and explain the exact grading criteria (~30% data judgment, ~25% AI collaboration, ~20% edge cases).

---

### Prompt 3: Architecture & Technology Stack Decision
> **User Prompt:** `"lets do it in node i guess since i have a choice"`

* **Intent:** Exercise the option granted in the take-home specification (*"Backend: Python strongly preferred. If Python isn't your language, use what you're strongest in and document how to run it"*) to use Node.js for a unified, high-performance full-stack JavaScript architecture.
* **Where the AI suggested something over-engineered:**
  * When running scaffolding commands, the AI initiated an interactive `npm create vite@latest` CLI which hung waiting for interactive keyboard input `(y)`.
* **How It Was Corrected / Overruled:**
  * The process was promptly cancelled. Instead of running fragile interactive CLI generators, we created deterministic `package.json` manifests directly, ensuring zero interactive stalls and reproducible installs.
  * The entire codebase was unified into **100% strict TypeScript** (`scripts/normalize.ts`, Express backend, React UI), eliminating redundant scripts and ensuring end-to-end type safety.

---

### Prompt 4: Production Implementation & Unit Test Verification
> **User Prompt:** `"okay complete it and prepare me with the prepare for the interview"`

* **Intent:** Implement the entire system end-to-end:
  1. Normalization engine with unit conversions, clamping, conflict resolution, and imputation.
  2. Backend REST API with whole-dataset sorting, pagination, multi-match title search, and rating persistence.
  3. Frontend dashboard with table, server-side sorting, CSV download, search feedback, and quirks chart.
  4. Comprehensive PR code review (`REVIEW.md`).
  5. Complete documentation (`DECISIONS.md`, `PROMPTS.md`, `README.md`, and `REFLECTION.md`).
* **Turning Points & Oversight:**
  * *Unit Tests:* Verified using Node 22's native `node:test` runner. All 9 tests passed in ~44ms, covering pagination offsets, multi-match search, rating boundaries, and duration unit conversions.
  * *Frontend Build:* Verified with `vite build`. Successfully bundled in ~689ms with zero errors.

---

## Summary of High-Signal Steering

| Scenario | AI Initial Proposal / Tendency | Engineer Steering & Correction |
| :--- | :--- | :--- |
| **Duration Units** | Blindly accept numeric numbers as milliseconds | Implemented `< 10,000` heuristic to detect and convert seconds to milliseconds |
| **Title Search** | Return single object `GET /songs/:title` | Overruled: Titles are non-unique. Implemented `GET /songs/search?title=...` returning `{ matches: [...] }` |
| **Sorting** | Sort current page items | Overruled: Strictly sorted entire dataset before pagination slicing |
| **Scaffolding** | Interactive CLI generation | Replaced with deterministic manifests and scripted installations |
| **Dual Scripting** | Single language backend | Provided both Node.js and Python normalization scripts for reviewer convenience |
