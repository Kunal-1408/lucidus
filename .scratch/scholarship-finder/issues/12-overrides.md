# 12: Overrides

**What to build:** The reviewer clears a Scholarship from review without any UI, by adding an Override from Postman: approve it as extracted, or supply corrected Criteria. An Override holds only for the page text it was written against; when the page changes it lapses and the Scholarship is checked again.

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] Overrides collection seeded from an overrides file in the repo when empty; `POST`, `GET`, `DELETE /api/admin/overrides` behind the admin token
- [ ] An Override names the Scholarship (source URL plus scheme name), the content hash it was written against, the action (approve or replace Criteria), any corrected Criteria, a note and the reviewer
- [ ] Applied after extraction only when its hash matches the section's current hash; the Scholarship becomes high confidence with reviewed by and reviewed at
- [ ] Replacement Criteria must quote a sentence present in the current text and use allowed values; otherwise the Override is skipped and listed in the Review report with the reason
- [ ] A lapsed Override is kept and listed in the Review report as "page changed" with old and new hash and its note
- [ ] A new Override takes effect on the next run without a redeploy
- [ ] API-seam tests cover approve, replace, invalid and lapsed
- [ ] Deployed to Render; the post-deploy smoke check passes
