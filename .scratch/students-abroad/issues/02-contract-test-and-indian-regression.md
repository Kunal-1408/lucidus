# 02: Form ↔ Criteria contract test and Indian regression scenarios

**What to build:** Two safety nets go in before any field changes. A contract test fails when the form can send a value no Criterion uses, or extraction can produce a value the form can't send. A set of e2e scenarios pins today's results buckets for a handful of Indian Profiles, so later tickets can prove Indian Students are unaffected.

See spec: "Testing Decisions".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A backend test imports the frontend's fixed lists and checks, field by field, that every value the form can send is in that field's Criterion vocabulary and the reverse
- [ ] Any value deliberately on one side only (for example the commented-out parent occupations) is listed in the test with the reason
- [ ] e2e scenarios ingest the existing fixture pages and pin the Eligible / Within reach / Tell us more buckets for at least four Indian Profiles (for example Class 12 in Kerala with 85%; Class 10 SC girl in Bihar with income under ₹1 lakh)
- [ ] `npm run check` passes
