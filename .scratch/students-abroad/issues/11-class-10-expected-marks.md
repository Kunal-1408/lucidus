# 11: Class 10 marks while boards are upcoming

**What to decide:** Should a Class 10 Student whose boards are still upcoming be asked for an expected Class 10 result (pre-boards or predicted), the way a Class 12 Student is?

The spec's grid and story 20 say no: "As a Class 10 Student whose boards are still upcoming, I want not to be asked for Class 10 marks, so that I don't guess at a result." Ticket 04 built it that way. But story 65 says "As an Indian Student, I want my results for the existing scholarships unchanged by this work". Before Wave 1, such a Student could give Class 10 marks and get a Within reach Goal ("Score 60% in Class 10 to unlock this"). Now they can't. The Odisha Profile in `backend/test/indian-regression.e2e-spec.ts` (Class 10 ST girl, boards upcoming, 3% short) moved NMMSS and LIC Special Scholarship from Within reach to Tell us more.

Options:
- **Keep the grid:** no Class 10 result before boards; update story 65 to name this exception. Nothing to build.
- **Ask an expected Class 10 result:** label it "Expected Class 10 result (pre-boards or predicted)" while boards are upcoming, as for Class 12; change the grid, the rules module, backend validation, and bring the Class 10 branch of `boardMarksGoal` back (removed as dead code in the Wave 1 review). The Odisha scenario returns to Within reach.

See spec: "Which questions appear (the grid)", stories 20, 24 and 65; ticket 04's comments.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] The spec owner picks an option and the spec (grid or story 65) is updated to match
- [ ] If an expected Class 10 result is asked: rules module, backend validation and Goal built test-first; the Odisha regression scenario pinned to its new buckets with the reason noted
- [ ] `npm run check` passes
