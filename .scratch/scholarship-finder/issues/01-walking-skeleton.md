# 01: Walking skeleton: one scholarship, end to end, deployed

**What to build:** The thinnest complete path through the system, live on the deployed URL. One seeded Watchlist entry (an HTML page holding one Scholarship) is ingested through the admin-token trigger; only gender and class are extracted, by regex. A Student opens the app, `POST /api/match` returns the Scholarship as Eligible, and the Results screen shows one card with its name, Amount text and official link. This slice also sets the patterns every later ticket follows: the repo shape, the test harness and the deploy.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] NestJS backend and Angular frontend exist as sibling apps with their own manifests, no workspace tooling
- [ ] NestJS serves the built Angular app and the API under `/api` from one service
- [ ] Backend connects to MongoDB Atlas via Mongoose; secrets come from environment variables and a git-ignored `.env`
- [ ] The Scholarship record carries the full field set from the spec (including status and needs review), even though most fields are unused yet
- [ ] The Watchlist is seeded from a JSON file in the repo when the collection is empty
- [ ] An admin-token-protected endpoint triggers ingestion of the seeded entry; a missing or wrong token is rejected
- [ ] `POST /api/match` returns the Scholarship as Eligible for a Profile whose gender and class match, and not for one that fails
- [ ] Results screen shows the card with name, Amount text and a link to the official URL
- [ ] API-seam test harness in place: real Nest app, in-memory MongoDB, fake fetcher serving committed fixtures, pinned clock; one test drives seed → ingest → match
- [ ] A smoke check script hits the deployed URL (Match returns, admin rejects a missing token)
- [ ] Deployed to Render; the post-deploy smoke check passes
