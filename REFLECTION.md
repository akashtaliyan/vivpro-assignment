# Engineering Reflection (`REFLECTION.md`)

This document provides concise, candid answers to the five reflection prompts defined in Section 6 of the Vivpro Take-Home assignment.

---

### 1. What is the single weakest part of your submission, and why did you leave it that way?

**Answer:**  
The persistence layer for ratings (`data/ratings.json` file-backed storage). 

While it guarantees that user ratings survive process restarts without requiring reviewers to configure a local PostgreSQL or Docker daemon, it uses synchronous file writes (`fs.writeFileSync`). Under high concurrent traffic with multiple worker processes, this approach will suffer from write locks, race conditions, and lack of ACID transactional guarantees. 

We left it this way deliberately to balance the **~3 hour budget** and maximize reviewer ergonomics: anyone can clone the repository and run `npm start` immediately with zero setup hurdles or external dependencies.

---

### 2. Where did AI save you the most time, and where did it cost you time or nearly lead you wrong?

**Answer:**  
* **Where AI saved the most time:**  
  Boilerplate and scaffolding: Generating the full SVG coordinate math for the scatter plot, writing the initial Express route boilerplate, and extracting column-oriented JSON into structured row formats. This saved ~45 minutes of manual typing.
* **Where AI cost time & nearly led us wrong:**  
  1. *Subtle logic traps:* When asked for pagination and sorting, AI models repeatedly generate `songs.slice(start, end).sort(...)` (sorting the visible page after slicing) because it mimics common front-end pagination patterns. We had to explicitly overrule this and enforce pre-slice sorting.
  2. *Interactive CLI hangs:* When executing scaffolding commands, AI agents attempted interactive `npm create vite` prompts that hung waiting for terminal `(y/n)` input, requiring manual cancellation and direct manifest creation.

---

### 3. What in the data surprised you? What did you decide to not fix, and why?

**Answer:**  
* **What surprised us:**  
  The intentional unit mismatch in `duration_ms` in Part 2. Seeing tracks like *Sunflower* with duration `158` and *Sweet Child O Mine* with duration `356` was a classic real-world upstream pipeline trap where an upstream team exported seconds into a column labeled milliseconds.
* **What we decided NOT to fix (and why):**  
  We decided **not to deduplicate songs sharing identical titles** (*"Perfect"*). In music metadata, identical titles frequently represent completely different recordings, artists, or acoustic arrangements. Instead of blindly merging by title, we treated track `id` as the primary key and adapted our API contract to return multiple matches for title queries.

---

### 4. If this went to production Monday and real users hit it, what breaks first?

**Answer:**  
1. **Concurrent Rating Collisions:** If multiple users rate songs simultaneously, simultaneous read-modify-write operations on `ratings.json` will overwrite each other or experience file lock contention.
2. **Memory Footprint at Scale:** Currently, the entire catalog is loaded into Node's V8 heap memory. With 25 songs this is instantaneous (<1ms); with 25 million songs, in-memory sorting and pagination will cause out-of-memory crashes (`JavaScript heap out of memory`).
3. **Unauthenticated Public Mutations:** The rating endpoint is unauthenticated, allowing a bot or single user to spam `POST /api/songs/:id/rating` and rewrite catalog ratings.

---

### 5. Sketch what it would take to make this production-grade (Lead / Architect)

**Answer:**  

To bring this music catalog service to production-grade reliability:

```
[ Upstream Data Exports ]
           │
           ▼
[ Pipeline: Apache Airflow + Great Expectations ]
   ├── Schema Validation & Unit Heuristics
   ├── Dead-Letter Queue (DLQ) for Malformed Rows
   └── Automated Imputation & Provenance Logging
           │
           ▼
[ Primary Database: AWS Aurora PostgreSQL ]
   ├── Partitioned Tables by Release Year/Genre
   ├── Full-Text Search Indices (GIN / pg_trgm)
   └── B-Tree Indices on (danceability, energy, tempo, duration_ms)
           │
           ▼
[ API Tier: Node.js / FastAPI on AWS ECS Fargate ]
   ├── Redis Cluster (Cache for Paginated/Sorted Queries)
   ├── Rate Limiting (Token Bucket via Redis)
   └── JWT / OAuth2 Authentication
           │
           ▼
[ Observability & Monitoring ]
   ├── OpenTelemetry Traces + Datadog APM
   ├── Prometheus Metrics (p95/p99 latency, error rates)
   └── PagerDuty Alerting on 5xx Spikes
```

* **Data Pipeline:** Formalize ingestion with Apache Airflow or Dagster. Enforce data contracts with Great Expectations, routing uncorrectable records to a dead-letter queue (DLQ) rather than silently coercing.
* **Data Storage & Indexing:** Move to PostgreSQL. Create composite indices on `(sort_column, id)` for efficient SQL-level keyset pagination (`WHERE id > :last_id ORDER BY tempo ASC LIMIT 10`), avoiding expensive `OFFSET` scans.
* **Observability:** Instrument all endpoints with OpenTelemetry for distributed tracing, Datadog for APM, and Prometheus metrics tracking query latency, cache hit ratios, and rating throughput.
* **Where to draw the line for v1:**  
  * **In v1:** PostgreSQL database, Docker containerization, pagination & full-dataset sorting at the SQL layer, rate limiting, and comprehensive integration tests.
  * **Post-v1:** Redis caching layer, full-text fuzzy search engine (Elasticsearch/OpenSearch), and real-time Kafka event streaming for user analytics.
