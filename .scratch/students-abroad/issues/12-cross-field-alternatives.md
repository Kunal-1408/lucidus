# 12: Alternatives across fields

**What to decide:** Should an Alternatives group be able to hold Criteria on different fields, so a Scholarship accepting a Board marks result _or_ a Test score passes a Student who meets either?

Today an Alternatives group holds Criteria on one Board marks field only, one per Result scale ("36 IB points or AAA at A-level", `alternativeGroup: 'class12Result'`). A page offering a Test score in place of Board marks ("A-levels AAA, IB 39, or SAT ≥ 1450") is stored as a `class12Result` group plus a standalone `sat` Criterion. The `sat` Criterion must pass on its own, so a Student with AAA at A-level or 39 IB points, who gives no SAT score, lands in Tell us more asking for a SAT score instead of Eligible, and one who gives a lower SAT score is hidden. Overrides can't write an Alternatives group at all (an Override's Criterion has no `alternativeGroup`), so a reviewer can't fix such a page by hand either.

Options:
- **Keep groups within one field:** record the gap in the spec (Criteria and matching); a reviewer can only drop the SAT Criterion through an Override. Nothing to build.
- **Groups across fields:** let the Board marks rule and the LLM guide put a Test score offered in place of a result into the same group (the group key no longer a field name); the Matcher's group rule is unchanged; Overrides gain `alternativeGroup`; the glossary's Alternatives group drops "one per Result scale". Goals and missing-field labels for a group mixing a result and a Test score need deciding (the first member with a Goal, as today?).

See spec: "Criteria and matching"; glossary terms Alternatives group and Test score; ticket 05's and ticket 08's comments.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The spec owner picks an option and the spec (and glossary, if groups span fields) is updated to match
- [x] If groups span fields: extraction rules, LLM guide, extractor grouping, Overrides and the Matcher built test-first; e2e over a fixture with "A-levels AAA, IB 39, or SAT ≥ 1450" that is Eligible for an A-level Student, an IB Student and a SAT Student
- [x] New rules reach stored Scholarships through ticket 09's re-extraction, or the gap is named
- [x] `npm run check` passes

## Comments

**2026-10-25 (spec owner):** groups across fields. Goal and missing-field label: first member with a Goal, as today.

**2026-10-25 (agent):** built on `feat/abroad-12-cross-field-alternatives` from `integrate/abroad-wave-3` (73eec54). `npm run check` green (backend 610 tests, 1 skipped; frontend 112).

- Group key: free name. Extraction names a Test score + Class 12 result group `class12Result` (same as stored per-scale groups, so nothing renamed). Overrides: any name.
- Extractor (`withTestScoresInPlaceOfResults`, extractor.ts), run on rules output and on rules + LLM merged: an ATAR/SAT joins the Class 12 result's group when (a) Class 12 result on 2+ scales (per-qualification list), (b) same sentence as the result with "or SAT/ATAR", or (c) LLM gave `alternativeGroup: "class12Result"`. All Class 12 result Criteria join with it. No Class 12 result → score stands alone, LLM's group dropped. GPA + SAT in separate sentences: both required (US pattern). "80% in Class 12 or equivalent and an ATAR": not grouped.
- LLM: `CriterionReading.alternativeGroup?`; schema adds optional `alternativeGroup` enum `["class12Result"]`; SYSTEM gains an Alternatives rule. Not run against real Haiku (real test skipped).
- Overrides: `ReplacementCriterion.alternativeGroup?` (text if given, `criteria[i].alternativeGroup must be a string`); `checkOverride` carries it on replace, and approve now keeps extracted groups (it dropped them before).
- Matcher: unchanged. Unit tests pin pass via SAT and the failing group's Goal from the first member with one (IB, SAT has none). Missing fields name every unknown member ("Class 12 result in A-level grades", "SAT score").
- e2e `backend/test/cross-field-alternatives.e2e-spec.ts`: `scales/a-level-ib-or-sat.html` ("Applicants need A-levels AAA, IB 39 points, or SAT ≥ 1450"; the rules need "points" to read IB) Eligible for A-level, IB, SAT Students; approve keeps the group; `scales/gpa-or-sat.html` grouped by a replace Override.
- Stored data: `EXTRACTION_VERSION` 3, so the next run re-extracts every Scholarship; approve Overrides on them lapse (09 rule).
- Known gap: per-scale list + a SAT asked *as well* ("IB 36 or AAA; all applicants also need SAT 1400") is grouped wrongly by (a). Low risk; a replace Override fixes it.
