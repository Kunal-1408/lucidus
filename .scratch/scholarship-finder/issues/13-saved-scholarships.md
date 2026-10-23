# 13: Saved scholarships

**What to build:** A Student saves scholarships without signing up, sees them on a Saved screen after reloading, and can remove them. Saved cards never silently vanish: they show the live Scholarship when it is still listed, or the snapshot taken when saved, with a badge saying why.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] `POST /api/saved`, `GET /api/saved`, `DELETE /api/saved/:id` keyed by the Visitor ID header
- [ ] Saving stores a snapshot of the card and its content hash at save time
- [ ] Active, not under review: live card, with "updated since you saved" when the hash changed
- [ ] Inactive: snapshot with "No longer listed"
- [ ] Needs review: snapshot with "Being re-checked" (tests seed the flag directly)
- [ ] Save button on Results cards; Saved screen lists them and allows removal
- [ ] Saved items persist across reloads
- [ ] API-seam tests cover all four card states
- [ ] Deployed to Render; the post-deploy smoke check passes
