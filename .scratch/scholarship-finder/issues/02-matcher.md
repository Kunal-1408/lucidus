# 02: Matcher: buckets, changeable limits, Goals, Deadline status, sorting, next-class cards

**What to build:** The full matching behaviour. A Student sees their results in three buckets, Eligible, Within reach and Tell us more, each card showing its Goals and Deadline status, sorted so the most urgent come first. The Matcher is a pure function of Profile, visible Scholarships and today's date.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Each Criterion evaluates to pass, fail or unknown; unknown when the Profile field is empty or an income threshold falls inside the Student's income band (a threshold on a band edge decides)
- [x] Eligible: all pass. Within reach: at least one fail, every fail changeable within its limit, at most two Goals. Tell us more: no fails, at least one unknown. Anything else is hidden
- [x] Unknowns never hide or demote a result; a Within reach card with unknowns stays Within reach and lists the missing fields
- [x] Changeable limits: class up one year only (never Class 12 → UG); marks only when boards are upcoming, gap at most 5, target at most 100; UG admission only for a Class 12 Student; gender, category, minority, citizenship, domicile and income never changeable
- [x] Marks Criteria check the marks field they name (Class 10 or latest)
- [x] Goals are phrased for the Student ("Score 80% to unlock this")
- [x] Deadline status: open, closing soon (within 30 days), closed, not announced; closed Scholarships drop out
- [x] Next-class cards show "Eligible from next year: watch for the next round", ignore the closed rule, and sort after the rest of Within reach
- [x] Within each bucket, sort by deadline soonest first, not announced last
- [x] Only active Scholarships not needing review are matched
- [x] Results screen shows all three buckets with Goals and Deadline status on each card
- [x] Exhaustive Matcher-seam tests cover every rule above, including the 30-day boundary and band edges
- [ ] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23** (agent, feat/02-matcher): Matcher built test-first at Seam 2 (`backend/src/match/matcher.spec.ts`), plus one Seam 1 check for a next-class card. Conventions later tickets rely on: `match(profile, scholarships, today)` takes today as an ISO date in India time (the controller derives it from the injected clock); income Criteria use field `incomeBand` with a rupee threshold (`lte`/`gte`) or band keys (`eq`/`in`); UG admission is a `class` Criterion with value `ug`; a fail is changeable only if the Criterion says `changeable: true` AND it is within the field limit. Cards now carry `deadlineStatus`, `goals` and `missing` (`{ field, label }[]`, for Prompts in ticket 04). Awaiting deploy and smoke check.

**2026-10-23 (agent):** Merged into `integrate/wave-1` (873368b), including the wave-1 code-review fixes. Every box except the Render deploy is met; backend 181 tests, lint, build and frontend build/tests pass. Status stays as is until the deploy and smoke check pass after merge to main; then set `Status: done`.
