# 16: README and demo dry run

**What to build:** The founders get a deployed link and a README explaining what was built and what comes next, and the five-minute demo has been rehearsed end to end against the deployed URL.

**Blocked by:** 01–15

**Status:** ready-for-agent

- [ ] README covers the architecture (fetcher, splitter, extractor, ingestion, matcher), how to run locally, how to use the admin endpoints from Postman, and the ADRs
- [ ] README lists the free-tier caveats (cold start of 30–50 seconds, open database allowlist) and the next steps with their triggers
- [ ] Demo script run against the deployed URL: two Ingestion runs with the second skipping; adding a founder-picked URL and finding it in results; walking the Prompts and three buckets; a Within reach card with its Goal; saving two scholarships and reloading
- [ ] Any issues found in the dry run are fixed or recorded as follow-up tickets
- [ ] Deployed to Render; the post-deploy smoke check passes
