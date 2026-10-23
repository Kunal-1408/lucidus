# 06: Watchlist admin endpoints

**What to build:** The operator manages the Watchlist from Postman on the deployed app: adds a source with its name, provider, type and official URL, lists entries with their last result, and removes entries. Adding a source never needs a code change or redeploy.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] `POST /api/admin/watchlist` adds a validated entry (URL, source type, region, name, provider, scholarship type, official URL, holds one or many, split rule when many)
- [x] Invalid entries are rejected with a clear reason
- [x] `GET /api/admin/watchlist` lists entries with each one's last result
- [x] `DELETE /api/admin/watchlist/:id` removes an entry; its Scholarships become inactive on the next run
- [x] All three require the admin token
- [x] Seeding from the repo JSON happens only when the collection is empty
- [x] An entry added through the endpoint is ingested on the next run and appears in Match results
- [ ] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** Built test-first on `feat/06-watchlist-admin` (`backend/test/watchlist-admin.e2e-spec.ts`). New `WatchlistController` (`backend/src/admin/watchlist.controller.ts`): `POST /api/admin/watchlist` answers 201 with the entry plus `id`, 400 with `message: [reasons...]` listing every problem, or 409 when the URL is already listed; `GET` lists entries (with `id`, `lastResult`) in insertion order; `DELETE /:id` answers 204, or 404. Validation lives in `backend/src/watchlist/watchlist-entry-input.ts`: `holds` defaults to `one`; `split` is required when `many` and rejected when `one`; the split fields required per type are json `itemsPath` + `nameField`, html `splitSelector`, pdf `splitPattern` (must compile as a regex). `lastResult` and unknown fields are dropped. Ingestion now marks active Scholarships whose `sourceUrl` is no longer on the Watchlist inactive at the start of each run (counted in `inactive`). Seeding was already empty-only (05); now covered by a restart test. Left unticked: the Render deploy check.

**2026-10-23 (agent):** Merged into `integrate/wave-1` (873368b), including the wave-1 code-review fixes. Every box except the Render deploy is met; backend 181 tests, lint, build and frontend build/tests pass. Status stays as is until the deploy and smoke check pass after merge to main; then set `Status: done`.
