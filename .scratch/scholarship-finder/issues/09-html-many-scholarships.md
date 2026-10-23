# 09: HTML sources holding many scholarships

**What to build:** A Watchlist entry can declare that its HTML page holds many Scholarships and give a heading selector to split on. Each scheme becomes its own Scholarship with its own hash, so editing one doesn't re-extract the rest; schemes that disappear go inactive; a split that finds nothing is flagged rather than wiping data.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] Entries declare holds one or many; many HTML entries give a split selector (a heading tag); each section runs to the next heading
- [x] Each Scholarship is identified by source URL plus scheme name; the name comes from the heading
- [x] Provider, type and official URL come from the entry unless the section contains its own official link
- [x] Each section has its own content hash; only changed sections are re-extracted
- [x] A scheme missing from a successful split becomes inactive; a renamed scheme appears as one inactive and one new
- [x] A split yielding zero Scholarships flags the entry empty, reports it, and leaves existing Scholarships untouched
- [x] API-seam tests cover all of the above with fixture pages
- [ ] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** Built test-first on `feat/09-html-many`. New `backend/src/ingestion/splitter.ts`: `split(entry, { raw, text })` returns `Section[]` (`schemeName`, `text`, optional `officialUrl`). One-scholarship entries pass through as one section named after the entry; many entries dispatch on `SPLIT_RULES[type]` (only `html` so far; ticket 10 adds `pdf`/`json` there). HTML: each element matching `split.splitSelector` starts a section that runs to the next match; the heading text is the scheme name and is part of the hashed text; text before the first heading is dropped; a repeated heading keeps the first. A section's own official link is the first `<a href>` inside it whose text contains "official" (resolved against the source URL); provider and type always come from the entry. The Fetcher now also returns `raw` (the body as served). Ingestion hashes, skips and extracts per section, then marks the source's active Scholarships whose scheme name the split no longer yields inactive; a split with zero sections counts `empty`, sets last result `empty` and touches nothing. A many HTML entry with no selector fails that source (06 validates on input). Tests: `backend/test/many-scholarships.e2e-spec.ts`, fixtures in `backend/test/fixtures/many/`. Left unticked: the Render deploy check.
