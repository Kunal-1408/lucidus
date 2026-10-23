# 06: Watchlist admin endpoints

**What to build:** The operator manages the Watchlist from Postman on the deployed app: adds a source with its name, provider, type and official URL, lists entries with their last result, and removes entries. Adding a source never needs a code change or redeploy.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] `POST /api/admin/watchlist` adds a validated entry (URL, source type, region, name, provider, scholarship type, official URL, holds one or many, split rule when many)
- [ ] Invalid entries are rejected with a clear reason
- [ ] `GET /api/admin/watchlist` lists entries with each one's last result
- [ ] `DELETE /api/admin/watchlist/:id` removes an entry; its Scholarships become inactive on the next run
- [ ] All three require the admin token
- [ ] Seeding from the repo JSON happens only when the collection is empty
- [ ] An entry added through the endpoint is ingested on the next run and appears in Match results
- [ ] Deployed to Render; the post-deploy smoke check passes
