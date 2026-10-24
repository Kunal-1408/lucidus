# 01: Profile rules module and Match validation

**What to build:** The form's existing rules stop living in the template, and the backend stops trusting the Profile it is sent. A Student who types a mark out of range sees an inline message and the answer is not saved (no more clamping to 100). A Match request with an out-of-range or contradictory Profile is answered 400 with a reason per field. No other visible change: this is the seam every later Profile ticket builds on.

See spec: "Profile rules module (frontend)" and "Profile validation (backend)".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Which questions are visible, the answers a change clears, and the range check for each answer are pure functions in the frontend Profile rules module; the template only renders what they return
- [x] Today's rules (single girl child needs female, stream needs Class 11–12, Class 10 marks hidden for Class 9) are covered by unit tests on the module
- [x] An out-of-range mark shows an inline message and is not saved; it is never clamped
- [x] The Match endpoint validates the Profile with the existing input-check helpers and answers 400 listing each bad field and why
- [x] e2e tests through the harness: a valid Profile still matches; an out-of-range mark, an unknown enum value and a contradictory answer (single girl child with gender male) each get 400
- [x] `npm run check` passes

## Comments

**2026-10-24 (agent):** Built on `feat/abroad-01-profile-rules`. Frontend: `frontend/src/app/profile-rules.ts` owns `visibleQuestions(profile)` (the set of questions asked), `applyChange(profile, change)` (merges a change and clears every answer to a question no longer asked, repeating until stable, so chained clears work), `checkAnswer(question, answer)` (message or undefined; marks 0-100, never clamped) and `profileForMatch` (moved from `profile-fields.ts`, which now only holds the fixed lists and the `Profile` type). The page reads `shown().has(...)` for every conditional question and keeps a per-field error signal for marks; tests in `profile-rules.spec.ts` (the old `profile-fields.spec.ts` cases moved there). Backend: `backend/src/match/profile-input.ts` `parseProfile(body)` returns `{ ok, profile }` or `{ ok: false, reasons }` like `parseWatchlistEntry`; the Match controller throws `rejected(reasons)` (400, `message` is the list). New helpers `numberBetween`, `yesNo`, `listOf` in `backend/src/input-checks.ts`; enum values come from `FIXED_LISTS` (`ingestion/normalise.ts`) and income bands from the matcher's exported `INCOME_BANDS`. Absent or null answers are not given; unknown fields are dropped (not rejected). e2e: `backend/test/profile-validation.e2e-spec.ts`. For 03/04: add a new conditional question by hiding it in `visibleQuestions` (its answer is then cleared by `applyChange` for free); add explicit clears that are not visibility-driven (board clears Board marks, scale clears value) inside `applyChange`; add each range to `checkAnswer`. Mirror every rule in `parseProfile`: the value check in the field loops, the cross-field rule in `contradictions()` with a reason of the form "<field> is only asked when ..." so the two sides stay readable side by side. Rules today mirror the old behaviour exactly: stream is asked when class is not given.
