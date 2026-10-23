# 09: HTML sources holding many scholarships

**What to build:** A Watchlist entry can declare that its HTML page holds many Scholarships and give a heading selector to split on. Each scheme becomes its own Scholarship with its own hash, so editing one doesn't re-extract the rest; schemes that disappear go inactive; a split that finds nothing is flagged rather than wiping data.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Entries declare holds one or many; many HTML entries give a split selector (a heading tag); each section runs to the next heading
- [ ] Each Scholarship is identified by source URL plus scheme name; the name comes from the heading
- [ ] Provider, type and official URL come from the entry unless the section contains its own official link
- [ ] Each section has its own content hash; only changed sections are re-extracted
- [ ] A scheme missing from a successful split becomes inactive; a renamed scheme appears as one inactive and one new
- [ ] A split yielding zero Scholarships flags the entry empty, reports it, and leaves existing Scholarships untouched
- [ ] API-seam tests cover all of the above with fixture pages
- [ ] Deployed to Render; the post-deploy smoke check passes
