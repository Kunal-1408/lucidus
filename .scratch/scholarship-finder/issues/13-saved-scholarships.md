# 13: Saved scholarships

**What to build:** A Student saves scholarships without signing up, sees them on a Saved screen after reloading, and can remove them. Saved cards never silently vanish: they show the live Scholarship when it is still listed, or the snapshot taken when saved, with a badge saying why.

**Blocked by:** 03, 05

**Status:** done

- [x] `POST /api/saved`, `GET /api/saved`, `DELETE /api/saved/:id` keyed by the Visitor ID header
- [x] Saving stores a snapshot of the card and its content hash at save time
- [x] Active, not under review: live card, with "updated since you saved" when the hash changed
- [x] Inactive: snapshot with "No longer listed"
- [x] Needs review: snapshot with "Being re-checked" (tests seed the flag directly)
- [x] Save button on Results cards; Saved screen lists them and allows removal
- [x] Saved items persist across reloads
- [x] API-seam tests cover all four card states
- [x] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** Built test-first on `feat/13-saved` (`backend/test/saved.e2e-spec.ts`, Seam 1: all four card states plus removal, per-Visitor keying, idempotent save and 400/404 cases). `POST /api/saved` takes `{ scholarshipId }` (the Match card `id`) and returns 201 with the Saved card; saving again returns the existing one. `GET /api/saved` returns `{ id, scholarshipId, savedAt, state, card }[]`, newest first, where `state` is `live | updated | no_longer_listed | being_rechecked` (inactive wins over needs review) and `card` is the live card for the first two and the save-time snapshot otherwise, with `deadlineStatus` worked out on the day of reading. `DELETE /api/saved/:id` answers 204, or 404 for another Visitor's item. Saved items are keyed by source URL plus scheme name, collection `saved_scholarships`. The harness gained `model(name)` for seeding flags like needs review. Frontend: Save button on Results cards, `/saved` screen with badges and Remove, "Saved" link in the header. Left unticked: the Render deploy check.

**2026-10-23 (agent):** Merged into `integrate/wave-1` (873368b), including the wave-1 code-review fixes. Every box except the Render deploy is met; backend 181 tests, lint, build and frontend build/tests pass. Status stays as is until the deploy and smoke check pass after merge to main; then set `Status: done`.

**2026-10-23 (agent):** Wave 1 reached `main` through PR #1 (a32061d) and is live on Render. On the current deploy (4de13d5), `node scripts/smoke.mjs <url> $(git rev-parse origin/main)` passes all four checks, including the deployed-commit check. `Status: done`.
