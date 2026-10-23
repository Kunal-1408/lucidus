# 03: Full Profile form, Core fields first

**What to build:** A Student fills in a short form of the six Core fields (class, domicile state, gender, category, income band, marks) and can open "more about you" for the rest. Every field is optional, uses the fixed lists from the spec, and the Profile is remembered in the browser only. The browser also gets its Visitor ID here.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Core fields shown first; all other Profile fields behind "more about you"
- [x] Every field optional; each uses the spec's fixed list (states and UTs, boards, streams, fields of study, destinations, income bands, categories, parent occupations, exams)
- [x] Category and minority are separate fields; Class 10 marks and latest marks are separate; boards upcoming is captured
- [x] Single girl child is shown only when gender is female
- [x] School state defaults to domicile state
- [x] Profile saved to local storage and pre-filled on reload; never sent anywhere except inside a Match request
- [x] A Visitor ID is generated once per browser, stored, and sent as a header on API calls
- [x] Submitting the form runs a Match and shows Results
- [ ] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** Built on `feat/03-profile-form`; everything except the deploy is done. Fixed lists live in `frontend/src/app/profile-fields.ts` (snake_case values, e.g. `tamil_nadu`, `2_5l_3l`, `beedi_cine_mine_worker`), mirrored as union types in `backend/src/match/profile.ts` (pure type change, no validation). Core fields shown up front include both latest marks and Class 10 marks; the rest sit in a "More about you" disclosure. Yes/no fields have a "Not saying" option so they stay optional. School state is stored only when the Student picks one; `profileForMatch` fills it from domicile state and drops single girl child unless gender is female, at the point the Match request is sent. Profile persists under local storage key `scholarship-finder.profile`; Visitor ID under `scholarship-finder.visitor-id`, sent as `x-visitor-id` on `/api/` calls by an HTTP interceptor (generated lazily on the first API call). No new backend behaviour, so no new backend tests; frontend verified by `ng build` and Angular's default tests.

**2026-10-23 (agent):** Merged into `integrate/wave-1` (873368b), including the wave-1 code-review fixes. Every box except the Render deploy is met; backend 181 tests, lint, build and frontend build/tests pass. Status stays as is until the deploy and smoke check pass after merge to main; then set `Status: done`.
