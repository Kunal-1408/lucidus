# 10: PDF and JSON sources, one or many

**What to build:** The Watchlist accepts PDF and JSON sources as well as HTML, each holding one Scholarship or many. A needs_js page can be replaced by the JSON endpoint it calls.

**Blocked by:** 09

**Status:** ready-for-agent

- [ ] PDF sources are fetched and their text extracted
- [ ] JSON sources are fetched and parsed; item text feeds the same Extractor; structured fields map to high confidence where they fit the fixed lists
- [ ] Many PDF entries split on a line pattern; each section runs to the next matching line
- [ ] Many JSON entries split by an items path and name field; each item is one Scholarship
- [ ] Per-section hashing, inactive marking and the empty flag behave as for HTML
- [ ] API-seam tests cover one and many for both types, including a needs_js page replaced by its JSON endpoint
- [ ] Deployed to Render; the post-deploy smoke check passes
