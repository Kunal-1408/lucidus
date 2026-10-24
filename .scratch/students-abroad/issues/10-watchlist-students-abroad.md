# 10: Watchlist sources for Students abroad

**What to build:** Students abroad start seeing scholarships meant for them. The provider type gains `foundation`, and the research shortlist goes on the Watchlist: SPDC first, then CBSE Single Girl Child (newest notice), the verified Gulf sources and the UK, USA, Canada, Singapore and Australia sources. Each page-splitting selector is checked against the live page before it is committed.

See spec: "Ingestion", Further Notes, and `.scratch/students-abroad/research-watchlist-sources.md`.

**Blocked by:** 03, 04, 05, 06, 07, 08

**Status:** ready-for-agent

- [ ] `foundation` is a valid provider type, accepted by the seed file parser and the admin endpoint; foundation drafts use it
- [ ] SPDC is on the Watchlist with its current-year guidelines URL; an e2e test with an SPDC fixture shows an NRI / PIO / OCI Student in Class 12 with 60%+ sees it, and a Student in India doesn't
- [ ] Each shortlisted source is added only after its official page and selectors are checked live; any source that can't be verified is left out and listed in a comment on this ticket
- [ ] A fixture per new page-splitting source proves it splits into the expected scholarships
- [ ] After deploy, an ingestion run reports each new source ok, and anything landing in the Review report is noted in a comment
