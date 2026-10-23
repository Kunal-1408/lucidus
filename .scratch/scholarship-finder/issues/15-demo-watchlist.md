# 15: The demo watchlist (~20 scholarships)

**What to build:** The curated Watchlist the founders will see: about 12 Indian Scholarships (NSP central schemes, myScheme pages, two or three corporate) and about 8 abroad undergraduate ones (official university pages found through WorqNow, plus programme pages). It deliberately exercises every source type and edge path, and every entry is verified to ingest on the deployed app.

**Blocked by:** 06, 08, 10

**Status:** ready-for-agent

- [ ] About 20 Scholarships in the seed file, from official sources only (no aggregators), all within Class 9–12 or undergraduate scope
- [ ] Coverage includes a PDF, a many-scholarship source, a JSON source, a needs_js page replaced by its JSON endpoint, and a deadline that isn't announced
- [ ] The developer picks the sources; each is verified to fetch, split and extract
- [ ] A full Ingestion run on the deployed app processes every entry; any low-confidence ones show in the Review report
- [ ] A second run reports the unchanged pages as skipped
- [ ] Fixture copies of representative pages are committed for tests
- [ ] Deployed to Render; the post-deploy smoke check passes
