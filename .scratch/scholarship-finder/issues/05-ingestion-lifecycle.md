# 05: Ingestion run lifecycle

**What to build:** The operator triggers an Ingestion run from Postman and gets a run ID back at once, then reads a summary of what happened. Reruns skip unchanged sources, removed sources mark their Scholarships inactive, flaky servers don't wipe data, and two runs never overlap.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `POST /api/admin/ingest` returns 202 with a run ID and works in the background; returns 409 with the current run's ID if a run is in progress
- [ ] `GET /api/admin/ingest/:runId` returns the summary: counts and per-source outcomes (fetched, unchanged, extracted, inactive, failed, needs_js)
- [ ] Unchanged content hash: only last verified is updated, no extraction
- [ ] 404 or 410: the source's Scholarships become inactive (never deleted)
- [ ] 5xx or network error: Scholarships untouched, no last-verified bump, reported as failed
- [ ] Cleaned text under a few hundred characters: entry flagged needs_js, extraction skipped
- [ ] Each Scholarship is upserted as soon as it is processed, so an interrupted run resumes on the next trigger
- [ ] Each Watchlist entry records its last result
- [ ] API-seam tests cover every outcome above using fixture responses
- [ ] Deployed to Render; the post-deploy smoke check passes
