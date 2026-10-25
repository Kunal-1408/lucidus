# 12: Alternatives across fields

**What to decide:** Should an Alternatives group be able to hold Criteria on different fields, so a Scholarship accepting a Board marks result _or_ a Test score passes a Student who meets either?

Today an Alternatives group holds Criteria on one Board marks field only, one per Result scale ("36 IB points or AAA at A-level", `alternativeGroup: 'class12Result'`). A page offering a Test score in place of Board marks ("A-levels AAA, IB 39, or SAT ≥ 1450") is stored as a `class12Result` group plus a standalone `sat` Criterion. The `sat` Criterion must pass on its own, so a Student with AAA at A-level or 39 IB points, who gives no SAT score, lands in Tell us more asking for a SAT score instead of Eligible, and one who gives a lower SAT score is hidden. Overrides can't write an Alternatives group at all (an Override's Criterion has no `alternativeGroup`), so a reviewer can't fix such a page by hand either.

Options:
- **Keep groups within one field:** record the gap in the spec (Criteria and matching); a reviewer can only drop the SAT Criterion through an Override. Nothing to build.
- **Groups across fields:** let the Board marks rule and the LLM guide put a Test score offered in place of a result into the same group (the group key no longer a field name); the Matcher's group rule is unchanged; Overrides gain `alternativeGroup`; the glossary's Alternatives group drops "one per Result scale". Goals and missing-field labels for a group mixing a result and a Test score need deciding (the first member with a Goal, as today?).

See spec: "Criteria and matching"; glossary terms Alternatives group and Test score; ticket 05's and ticket 08's comments.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] The spec owner picks an option and the spec (and glossary, if groups span fields) is updated to match
- [ ] If groups span fields: extraction rules, LLM guide, extractor grouping, Overrides and the Matcher built test-first; e2e over a fixture with "A-levels AAA, IB 39, or SAT ≥ 1450" that is Eligible for an A-level Student, an IB Student and a SAT Student
- [ ] New rules reach stored Scholarships through ticket 09's re-extraction, or the gap is named
- [ ] `npm run check` passes
