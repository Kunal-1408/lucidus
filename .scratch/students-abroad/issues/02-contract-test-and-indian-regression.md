# 02: Form ↔ Criteria contract test and Indian regression scenarios

**What to build:** Two safety nets go in before any field changes. A contract test fails when the form can send a value no Criterion uses, or extraction can produce a value the form can't send. A set of e2e scenarios pins today's results buckets for a handful of Indian Profiles, so later tickets can prove Indian Students are unaffected.

See spec: "Testing Decisions".

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A backend test imports the frontend's fixed lists and checks, field by field, that every value the form can send is in that field's Criterion vocabulary and the reverse
- [x] Any value deliberately on one side only (for example the commented-out parent occupations) is listed in the test with the reason
- [x] e2e scenarios ingest the existing fixture pages and pin the Eligible / Within reach / Tell us more buckets for at least four Indian Profiles (for example Class 12 in Kerala with 85%; Class 10 SC girl in Bihar with income under ₹1 lakh)
- [x] `npm run check` passes

## Comments

**2026-10-24 (agent):** Built on `feat/abroad-02-contract-and-regression`; every box is met and no production code changed. The contract test is `backend/src/scholarships/form-criteria-contract.spec.ts`. It imports `frontend/src/app/profile-fields.ts` (backend `tsconfig.json` `rootDir` widened to `..` so the import type-checks; builds still use `tsconfig.build.json` with `./src`) and, per field, checks every form value through `readValue` (the gate the LLM, reviewers and JSON sources share) and every `FIXED_LISTS` value against the form's list. Class is checked over every label a source can write, yes/no and marks fields by their readings, and each income band by asking the Matcher to decide a ₹1 and a ₹1 crore limit. One-sided values sit in `FORM_ONLY_FIELDS` (`boardsUpcoming`) and `CRITERION_ONLY_VALUES` (`construction_worker`, `beedi_cine_mine_worker`), each with its reason; the test also fails if a listed value stops being one-sided. The two parent occupations are real drift, recorded not fixed: they are commented out of the form while extraction still reads them, so a Scholarship for those Students can only ever ask or fail. Tickets 03/04 that add or rename a field or value add it to `FORM_LISTS` (or the yes/no or marks lists) and to the Criterion side in the same change; a scale or currency field with no fixed list needs its own `describe`, like `incomeBand`'s.

The regression scenarios are `backend/test/indian-regression.e2e-spec.ts`: the demo Watchlist fixtures plus `many/schemes-v1.html` (added through the admin endpoint), ingested on 2026-09-01, with buckets and Goals pinned for five Indian Profiles (Class 12 Kerala girl with 85%; Class 10 SC Bihar girl under ₹1 lakh; Class 9 OBC Tamil Nadu boy at a government school; Class 11 science Maharashtra boy over ₹8 lakh; Class 10 ST Odisha girl 3% short with boards upcoming). They pin today's results, misreadings included: NMMSS carries a `category: [sc, st]` Criterion read from "For the SC/ST students, this cut off is 32% marks" (the relaxation filter matches only "cut-off") and a 60% Class 10 marks Criterion from a continuation condition, and the state page's "Class 12 with Science" gives no stream Criterion. When 03/04 re-extract these pages onto new fields, keep the Profiles and change an expected bucket only where the ticket means to move it, saying why in the test; a fix to the NMMSS misreadings will move the Bihar and Odisha scenarios.

**2026-10-24 (agent):** Merged into `integrate/abroad-wave-1` (8bf2524), including the Wave 1 code-review fixes. Every box is met; `npm run check` passes (backend 438 tests, 1 skipped; frontend 48 tests). Status stays as is until the branch is merged to main and the deploy and smoke check pass; then set `Status: done`.

**2026-10-25 (agent):** Students abroad Wave 1 reached `main` through PR #11 (0eb1f31) and is live on Render. `node scripts/smoke.mjs <url> $(git rev-parse origin/main)` passes all five checks, including the deployed-commit check and every seed entry on the Watchlist. On live, `/api/match` answers 400 with reasons for a Class 12 result of 105% and for single girl child with gender male, and 200 for a Class 12 Kerala Profile in the new shape (no Eligible cards, as expected with the marks gap until ticket 09). `Status: done`.
