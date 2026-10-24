# 04: Board marks on Indian boards (percentage)

**What to build:** "Latest exam marks" is replaced by Board marks. The board list becomes CBSE, CISCE, State board, Cambridge/UK, IB, US high school, Other. Each class sees only the board results it has (the grid), with boards-upcoming moved next to the marks; a Class 12 Student with boards upcoming enters an expected result. This ticket handles the percentage scale used by Indian boards; other scales come in 05.

See spec: "Which questions appear (the grid)", glossary term Board marks.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Profile gains a Class 10 result and a Class 12 result, each `{ scale, value }`, with only the percentage scale for now; `latestMarks` stays readable until ticket 09
- [ ] Rules module implements the grid: Class 9 none; Class 10 gets the Class 10 result only once boards are done; Class 11 the Class 10 result; Class 12 both, the Class 12 one labelled "Expected Class 12 result (pre-boards or predicted)" while boards are upcoming; boards-upcoming only for Class 10 and 12; class not given shows both results and no boards-upcoming
- [ ] Changing class clears answers the grid rules out; a percentage outside 0–100 is refused
- [ ] Boards-upcoming is a Core field placed next to the marks; form order follows the spec
- [ ] Saved Profiles drop `latestMarks` on load
- [ ] Extraction produces Class 10 and Class 12 result Criteria; marks for any other year (for example NMMS's Class 7/8) become Extra requirements
- [ ] Within reach marks Goals keep today's rule (boards upcoming, gap ≤ 5) on both results
- [ ] e2e: Santoor / Central Sector / Ishan Uday style fixtures match on the right result; NMMS shows its Class 8 rule as an Extra requirement; Indian regression scenarios still pass (updated only where the old field is replaced, with the reason noted)
