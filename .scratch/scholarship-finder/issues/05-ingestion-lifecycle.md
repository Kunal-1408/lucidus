# 05: Ingestion run lifecycle

**What to build:** The operator triggers an Ingestion run from Postman and gets a run ID back at once, then reads a summary of what happened. Reruns skip unchanged sources, removed sources mark their Scholarships inactive, flaky servers don't wipe data, and two runs never overlap.

**Blocked by:** 01

**Status:** done

- [x] `POST /api/admin/ingest` returns 202 with a run ID and works in the background; returns 409 with the current run's ID if a run is in progress
- [x] `GET /api/admin/ingest/:runId` returns the summary: counts and per-source outcomes (fetched, unchanged, extracted, inactive, failed, needs_js)
- [x] Unchanged content hash: only last verified is updated, no extraction
- [x] 404 or 410: the source's Scholarships become inactive (never deleted)
- [x] 5xx or network error: Scholarships untouched, no last-verified bump, reported as failed
- [x] Cleaned text under a few hundred characters: entry flagged needs_js, extraction skipped
- [x] Each Scholarship is upserted as soon as it is processed, so an interrupted run resumes on the next trigger
- [x] Each Watchlist entry records its last result
- [x] API-seam tests cover every outcome above using fixture responses
- [x] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** Built test-first on `feat/05-ingestion-lifecycle`. `POST /api/admin/ingest` now answers 202 `{ runId }` (409 `{ runId }` while a run is in progress) and runs in the background; `GET /api/admin/ingest/:runId` returns `{ runId, state, startedAt, finishedAt, counts, sources }`, written after every source so it can be read mid-run. A run cut off by the host stopping is marked `interrupted` on the next startup, and the next trigger resumes it through hash skipping. Counters live in `COUNT_NAMES` in `backend/src/ingestion/run-summary.ts`; add a name there for a new counter (09: `empty`). The Extractor is now injected (`EXTRACTOR`), as are the fetch and clock. The last-result box is met in storage only; 06's `GET /api/admin/watchlist` will make it visible. Left unticked: the Render deploy check.

**2026-10-23 (agent):** Merged into `integrate/wave-1` (873368b), including the wave-1 code-review fixes. Every box except the Render deploy is met; backend 181 tests, lint, build and frontend build/tests pass. Status stays as is until the deploy and smoke check pass after merge to main; then set `Status: done`.

**2026-10-23 (agent):** Wave 1 reached `main` through PR #1 (a32061d) and is live on Render. On the current deploy (4de13d5), `node scripts/smoke.mjs <url> $(git rev-parse origin/main)` passes all four checks, including the deployed-commit check. `Status: done`.
