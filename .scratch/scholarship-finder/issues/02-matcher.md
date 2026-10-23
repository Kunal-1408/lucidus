# 02: Matcher: buckets, changeable limits, Goals, Deadline status, sorting, next-class cards

**What to build:** The full matching behaviour. A Student sees their results in three buckets, Eligible, Within reach and Tell us more, each card showing its Goals and Deadline status, sorted so the most urgent come first. The Matcher is a pure function of Profile, visible Scholarships and today's date.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Each Criterion evaluates to pass, fail or unknown; unknown when the Profile field is empty or an income threshold falls inside the Student's income band (a threshold on a band edge decides)
- [ ] Eligible: all pass. Within reach: at least one fail, every fail changeable within its limit, at most two Goals. Tell us more: no fails, at least one unknown. Anything else is hidden
- [ ] Unknowns never hide or demote a result; a Within reach card with unknowns stays Within reach and lists the missing fields
- [ ] Changeable limits: class up one year only (never Class 12 → UG); marks only when boards are upcoming, gap at most 5, target at most 100; UG admission only for a Class 12 Student; gender, category, minority, citizenship, domicile and income never changeable
- [ ] Marks Criteria check the marks field they name (Class 10 or latest)
- [ ] Goals are phrased for the Student ("Score 80% to unlock this")
- [ ] Deadline status: open, closing soon (within 30 days), closed, not announced; closed Scholarships drop out
- [ ] Next-class cards show "Eligible from next year: watch for the next round", ignore the closed rule, and sort after the rest of Within reach
- [ ] Within each bucket, sort by deadline soonest first, not announced last
- [ ] Only active Scholarships not needing review are matched
- [ ] Results screen shows all three buckets with Goals and Deadline status on each card
- [ ] Exhaustive Matcher-seam tests cover every rule above, including the 30-day boundary and band edges
- [ ] Deployed to Render; the post-deploy smoke check passes
