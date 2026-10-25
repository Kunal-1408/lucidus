# 08: ATAR and SAT

**What to build:** A Student in Australia can give their ATAR, and a Student on the US high-school board or heading to the US can give their SAT score, as answers separate from Board marks. Both are extracted and matched.

See spec: "Profile" (ATAR, SAT).

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [x] ATAR (0–99.95) shown only when the country is Australia; SAT (400–1600) only for the US high-school board or a US destination; each cleared when its condition stops holding
- [x] Backend validation enforces the same ranges and conditions
- [x] Extraction produces ATAR and SAT Criteria (`gte`, changeable)
- [x] e2e: an ATAR fixture and a SAT fixture each pass, fail and are unknown as expected

## Comments

**2026-10-25 (agent):** Built on `feat/abroad-08-atar-sat` from `integrate/abroad-wave-2` (0805e29); every box is met. `npm run check` passes (backend 581 tests, 1 skipped; frontend 114 tests).

Profile (both copies): `atar` and `sat` are plain numbers, not Board marks and not in `SLOT_SCALES` or `ResultScale`. Their ranges live in `TEST_SCORE_RANGES` (`backend/src/match/profile.ts`, frontend copy in `profile-rules.ts`; the contract test checks they are equal). Glossary gains Test score; Core fields name the ATAR or SAT score where asked.

Frontend rules (`profile-rules.ts`): `unaskedTestScores` (part of `visibleQuestions`) hides `atar` unless `countryOfResidence === 'AU'` and `sat` unless `board === 'us_high_school'` or `destination === 'US'`. Unlike most questions, neither is asked while its deciding answer is missing, since the spec asks them "only" there. Clearing is through `withoutUnasked`, so leaving Australia, or changing board and destination so neither asks for it, drops the score. `checkAnswer` refuses out-of-range scores ("Enter an ATAR from 0 to 99.95.", "Enter a SAT score from 400 to 1600."). The page shows both right after Board marks (spec form order), with an inline error and nothing saved when the score is out of range.

Backend validation (`profile-input.ts`): `numberBetween` per `TEST_SCORE_RANGES` (`atar must be from 0 to 99.95`, `sat must be from 400 to 1600`) and `testScoreContradictions` (`atar is only asked when countryOfResidence is AU`, `sat is only asked for the us_high_school board or when destination is US`).

Criteria and matching: `CRITERION_FIELDS` gains `atar` and `sat` (`gte`, changeable). The Matcher compares them as plain numbers; missing labels are "ATAR" and "SAT score". No Goal is offered on either (the spec allows Goals only on percentage and IB points), so a failing score hides the card.

Extraction: `TEST_SCORE_RULES` in `extraction-rules.ts` reads the first figure after "ATAR" or "SAT" in the same sentence ("an ATAR of at least 99.90", "SAT composite score of 1200", "SAT score ≥ 1450", "1,300"), and both words join `RULE_WORDS` so those sentences reach the rules. `normaliseValue` (`toTestScore`) drops a figure outside the range, which keeps NMMS's "Scholastic Aptitude Test (SAT) ... 40 % marks" from becoming a SAT Criterion (unit test on the NMMSS page). The LLM field guide describes both, and its marks rule now says an ATAR or SAT minimum is its own criterion. Tests: rules in `profile-rules.spec.ts` ("ATAR and SAT"); extractor unit tests; validation cases in `profile-validation.e2e-spec.ts`; `backend/test/test-scores.e2e-spec.ts` over `fixtures/test-scores/{atar,sat}.html` for pass, fail, unknown and the missing labels. The overrides e2e list of Criterion fields gains `atar, sat`. Indian regression scenarios are unchanged.

Not done / recorded: a SAT score offered as an alternative to Board marks on another page ("A-levels AAA, IB 39, American: SAT ≥ 1450") becomes a separate SAT Criterion, not a member of the `class12Result` alternatives group. A Student with A-levels on such a page would see Tell us more asking for a SAT score, not Eligible. To fix it, groups would need to span fields. A predicted ATAR ("predicted to achieve an ATAR of 95") is read as the ATAR Criterion, not an Extra requirement as the research file suggested: a Class 12 Student gives the ATAR they expect. Changing either is for the spec owner.
