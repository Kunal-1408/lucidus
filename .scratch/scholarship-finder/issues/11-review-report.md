# 11: Review report and zero-Criteria review

**What to build:** The reviewer can fetch a Review report listing every Scholarship that needs review, with the Criterion that made it low and its sentence. A Scholarship extracted with no Criteria at all goes to review instead of showing as Eligible to everyone.

**Blocked by:** 08

**Status:** ready-for-agent

- [x] `GET /api/admin/review` (admin token) lists Scholarships needing review with the weakest Criterion and its source sentence
- [x] A Scholarship with zero Criteria is set needs review and appears in the report with that reason
- [x] Scholarships needing review stay hidden from Match
- [x] API-seam tests cover both reasons
- [ ] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent, feat/11-review-report):** Built test-first at Seam 1 (`backend/test/review-report.e2e-spec.ts`, fixture `backend/test/fixtures/review/no-criteria.html`). New `ReviewController` (`backend/src/admin/review.controller.ts`): `GET /api/admin/review` behind the admin token answers 200 with a plain JSON array of Review report entries, sorted by `sourceUrl` then `schemeName`, and `[]` when nothing needs review. It lists active Scholarships with `needsReview: true` (`NEEDING_REVIEW` in `backend/src/review/review-report.ts`); inactive ones drop out. Every entry carries `reason`, `id`, `name`, `sourceUrl`, `schemeName`, `officialUrl` and `contentHash` (the section's current hash, which is what an Override is written against). Two reasons so far. `reason: 'low confidence'` adds `criterion`, the full stored weakest Criterion (`field`, `op`, `value`, `changeable`, `sourceText`, `confidence`), taken as the first of the lowest Confidence. `reason: 'no criteria'` adds nothing; zero-Criteria Scholarships are still stored `confidence: 'high'` + `needsReview: true`, and the empty list is how the two reasons are told apart. Ingestion is unchanged except that the weakest-Criterion logic moved to `backend/src/scholarships/confidence.ts` (`weakestCriterion`, `scholarshipConfidence`), now shared by Ingestion and the report. Match already hid needs-review Scholarships through `VISIBLE`; the tests now pin that for both reasons. Conventions for 12: `ReviewEntry` in `review-report.ts` is a discriminated union on `reason`. An invalid Override (e.g. `reason: 'invalid override'` with its reasons) and a lapsed one (`reason: 'page changed'` with old and new hash and the note) should each get their own interface in that union plus a builder, and `ReviewController.report()` appends them after the Scholarship entries. Keep the shared base fields (Scholarship key, name, current `contentHash`) on every entry so the reviewer can write the next Override straight from the report. A Scholarship an Override clears leaves the report by being stored `needsReview: false`, not by extra filtering here. Left unticked: the Render deploy check.

**2026-10-23 (agent):** Merged into `integrate/wave-2` (a04290b), including the wave-2 code-review fixes. Every box except the Render deploy is met; backend 252 tests (1 skipped: the opt-in real-Haiku test, never run, no key here), lint, build and frontend build/tests pass. Status stays as is until the deploy and smoke check pass after merge to main; then set `Status: done`.
