# 14: University pointers from WorqNow

**What to build:** A Student planning to study in the UK, USA, Canada or Australia sees, at the bottom of their results, a list of universities there that offer international scholarships, under the label "Universities in [country] with international scholarships. Not checked against your profile; see their site for details." Names only. The list is refreshed from WorqNow on each Ingestion run and never touches Scholarships or matching.

**Blocked by:** 03, 05

**Status:** done

- [x] Each Ingestion run calls WorqNow's per-country university endpoints for UK, USA, Canada and Australia using the WorqNow key from the environment
- [x] Results replace that country's University pointers in their own collection; a failed fetch keeps the previous list and is reported in the run summary
- [x] Display names come from WorqNow; missing names fall back to the title-cased code, corrected by a small names file
- [x] `POST /api/match` returns pointers only when the destination is one of the four countries
- [x] Cards show names only: no value, no eligibility, no link; the label is shown above them
- [x] University pointers never appear in buckets, Prompts or Saved
- [x] WorqNow client faked in API-seam tests
- [x] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** Built test-first on `feat/14-university-pointers`. WorqNow's real API (checked live): `GET https://api.worqnow.ai/education/{uk|usa|ca|au}/universities?has_scholarship=true&limit=100` answers `{ count, data: [{ code, name, ... }] }`; `limit` caps at 100 and each country has about 50. It currently answers without a key; we send `WORQNOW_API_KEY` as `x-api-key` when set (header name assumed from WorqNow's OpenAPI, where `x-api-key` is the only key header listed). The client sits behind the `WORQNOW` token (`backend/src/universities/worqnow.ts`) and the harness fakes it (`worqnow` option, `serveWorqNow`). After the Watchlist loop each run replaces each country's pointers in `university_pointers`; a failed country keeps its list, adds to the `worqnow_failed` counter and appears in `sources` as `{ url: 'worqnow:<country>', result: 'failed', detail }`. A successful but empty list does replace the old one. Missing names use `backend/data/university-names.json`, falling back to the title-cased code. `POST /api/match` returns `universityPointers: [{ country, label, names }]` (an empty array, or one group for the destination); the Matcher never sees them, so they can't reach buckets, Prompts or Saved. Results shows the label and plain name cards with no Save button, link or value. Left unticked: the Render deploy check.

**2026-10-23 (agent):** Merged into `integrate/wave-1` (873368b), including the wave-1 code-review fixes. Every box except the Render deploy is met; backend 181 tests, lint, build and frontend build/tests pass. Status stays as is until the deploy and smoke check pass after merge to main; then set `Status: done`.

**2026-10-23 (agent):** Wave 1 reached `main` through PR #1 (a32061d) and is live on Render. On the current deploy (4de13d5), `node scripts/smoke.mjs <url> $(git rev-parse origin/main)` passes all four checks, including the deployed-commit check. `Status: done`.
