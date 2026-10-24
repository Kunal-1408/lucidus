# 01: Profile rules module and Match validation

**What to build:** The form's existing rules stop living in the template, and the backend stops trusting the Profile it is sent. A Student who types a mark out of range sees an inline message and the answer is not saved (no more clamping to 100). A Match request with an out-of-range or contradictory Profile is answered 400 with a reason per field. No other visible change: this is the seam every later Profile ticket builds on.

See spec: "Profile rules module (frontend)" and "Profile validation (backend)".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Which questions are visible, the answers a change clears, and the range check for each answer are pure functions in the frontend Profile rules module; the template only renders what they return
- [ ] Today's rules (single girl child needs female, stream needs Class 11–12, Class 10 marks hidden for Class 9) are covered by unit tests on the module
- [ ] An out-of-range mark shows an inline message and is not saved; it is never clamped
- [ ] The Match endpoint validates the Profile with the existing input-check helpers and answers 400 listing each bad field and why
- [ ] e2e tests through the harness: a valid Profile still matches; an out-of-range mark, an unknown enum value and a contradictory answer (single girl child with gender male) each get 400
- [ ] `npm run check` passes
