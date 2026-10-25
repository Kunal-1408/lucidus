# 05: Other Result scales and board narrowing

**What to build:** Students on IB, Cambridge/UK and US curricula give their results on their own scale. The board presets the scale and narrows the grid: IB and Cambridge/UK have no Class 10 result, US high school gives one GPA in the Class 12 slot. A Criterion on a different scale than the Student's answer is unknown, and a scholarship accepting alternatives across scales passes when any one passes.

See spec: "Which questions appear" (board narrowing), "Criteria and matching", glossary term Result scale.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] Scales: percentage, CGPA /10 (Class 10, CBSE), GPA /4, IB points (whole numbers 0–45), A-level grades (A*–E); each range-checked, invalid answers refused
- [x] Board presets the scale (CBSE/CISCE/State percentage; Cambridge/UK A-level grades; IB IB points; US GPA); the Student may change it; changing board or scale clears the result
- [x] Board narrowing per the spec grid, in the rules module and in backend validation
- [x] Extraction records the scale on each result Criterion; GCSE/IGCSE requirements and unsupported scales (weighted GPA, AP, Quebec's R score) become Extra requirements
- [x] A scholarship listing alternatives stores one Criterion per scale as an alternatives group: passes if any member passes, fails if every judgeable member fails and none is unknown, otherwise unknown
- [x] A Criterion on a different scale is unknown and its missing-field label names the result that would settle it
- [x] Within reach Goals on IB points with a gap of at most 2 points; never on grades or GPA
- [x] e2e: an IB-or-A-level fixture matches an IB Student and an A-level Student, and is unknown for a percentage-only Student; Indian regression scenarios still pass

## Comments

**2026-10-25 (agent):** Built on `feat/abroad-05-result-scales`; every box is met. `npm run check` passes (backend 475 tests, 1 skipped; frontend 79 tests).

Profile (both copies): `ResultScale` is `percentage` | `cgpa_10` | `gpa_4` | `ib_points` | `a_level`; `BoardResult` is a union, a number on every scale but `a_level`, whose value is a list of `ALevelGrade` (`A_LEVEL_GRADES`, best first). `SLOT_SCALES` says which scales each result takes (CGPA only `class10Result`; GPA, IB points and A-level grades only `class12Result`). `RESULT_SCALE_RANGES` moved to `backend/src/match/profile.ts` (numeric scales only, `[min, max]`) so validation and normalisation share it. Board narrowing is `NO_CLASS_10_EXAM_BOARDS` (`cambridge`, `ib`, `us_high_school`: no Class 10 result, no boards upcoming in Class 10) and `NO_CLASS_12_EXAM_BOARDS` (`us_high_school`: no boards upcoming in Class 12). The frontend copies of all five live in `profile-rules.ts` (`A_LEVEL_GRADES` in `profile-fields.ts`); the contract test checks each pair is equal and that each slot's Criteria hold exactly the scales the form offers.

Frontend rules (`profile-rules.ts`): `narrowedByBoard` joins the grid in `boardMarksHidden`; `resultScale(question, profile, picked?)` gives the scale (picked, else the result's, else the board preset, never one the slot doesn't take); `readResult(scale, typed)` reads typed input ("a*ab" → `['A*','A','B']`); `shownResult` shows it back; `checkAnswer` refuses with a per-scale message ("Enter whole IB points from 0 to 45.", "Enter A-level grades from A* to E, such as A*AB."). `applyChange` clears both results on a board change (`withBoardClears`). The page keeps the picked scale per slot in a signal (not saved: after a reload the scale comes from the result, else the preset), resets it on a board change, and clears the result on a scale change.

Backend validation (`profile-input.ts`): `boardResult` checks the scale against `SLOT_SCALES` and the value per scale (`class12Result.value must be a whole number from 0 to 45`, `... must be A-level grades from A* to E`); `boardMarksContradictions` adds `class10Result is not asked for the ib board` and `boardsUpcoming is not asked for the us_high_school board`.

Matching (`matcher.ts`): `conditions` groups Criteria by `alternativeGroup` (new optional Criterion prop), `judge` applies the any/all/unknown rule, a failing group counts as one fail and takes the first member's Goal; `missingFields` labels a Criterion on another scale "Class 12 result in IB points" (`SCALE_LABELS`). `meetsGrades` compares A-level grades best first, each at least the grade asked, as many grades as asked. `boardMarksGoal` gives "Score 36 IB points to unlock this" within 2 points (`MAX_IB_POINTS_GAP`); never on CGPA, GPA or grades.

Extraction: `normaliseValue` reads "60", "8.5 CGPA", "3.5 GPA", "36 IB points", "AAB at A-level" (`readBoardResult`), dropping a scale the slot doesn't take. `extraction-rules.ts`: `FieldRule` may return several `Found`; `boardMarksRule` adds `SCALE_RULES` (IB points in an IB sentence, A-level grades in an A-level sentence, a minimum GPA, a minimum CGPA only when the sentence ties it to Class 10 — the AICTE Pragati PDF's "CGPA X 9.5" conversion line was read as a Class 10 CGPA until `minimumOn` and that check went in). Results on several scales for one slot become one Criterion each, grouped as `alternativeGroup: '<field>'`. `otherYearMarks` became `marksExtraRequirements`, adding GCSE/IGCSE, weighted GPA, AP and R score sentences as Extra requirements (texts "GCSE/IGCSE results", "A weighted GPA", "AP exam scores", "Quebec's R score"); the board keyword rule skips GCSE/IGCSE grade sentences. The LLM guide describes each scale's format and asks for alternatives as separate values; the extractor splits a multi-value Board marks reading into a group (`alternatives`). Glossary gains Alternatives group. e2e: `backend/test/result-scales.e2e-spec.ts` over `fixtures/scales/*.html`. Indian regression scenarios pass unchanged.

Not done / recorded: Overrides can't write an alternatives group (an Override's Criterion has no `alternativeGroup`). "AP" alone is never read (it is Andhra Pradesh in Indian sources); only "AP exams/scores/courses/tests" or "Advanced Placement". An A-level requirement of one grade ("an A at A-level") is not read by the rules (left to the LLM): the grade pattern needs two or more grades so "A-level" itself isn't read as a grade. Labels don't change by board (a US Student sees "Class 12 board result" with the GPA scale picked). An A-level Student below the grades asked on an IB-or-A-level page lands in Tell us more asking for IB points, as the spec's group rule says; whether that is useful is for the spec owner.

For 08 (ATAR/SAT): if they are plain `numberBetween` answers, nothing here needs extending; `TEST_CUT_OFF` already keeps SAT sentences away from the marks rules, and `SCALE_RULES` is the place a new scale's extraction goes if ATAR becomes a Result scale. Keep 08's fields out of `SLOT_SCALES` unless they really sit in a Board marks slot. 06/07 touch `profile-input.ts`, `profile-rules.ts` and the LLM guide near these edits; expect small textual conflicts only.
