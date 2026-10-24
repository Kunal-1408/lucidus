# 18: EBC and DNT categories

**What to build:** A Student can say they are EBC (Economically Backward Class) or DNT (Denotified, Nomadic and Semi-Nomadic Tribes), and a Scholarship for those groups gets a category Criterion naming them. That lets PM YASASVI school go back on the Watchlist with the Criteria its guidelines state.

**Blocked by:** 17

**Status:** ready-for-agent

- [ ] `ebc` and `dnt` are category options in the Profile, the profile form, value normalisation, the category rule's options and the LLM field guide. EBC is not EWS
- [ ] Category stays never changeable
- [ ] "OBC, EBC and DNT students" gives category [obc, ebc, dnt]
- [ ] PM YASASVI Top Class Education in Schools for OBC, EBC and DNT Students (`https://scholarships.gov.in/public/schemeGuidelines/3061_G.pdf`) is added back to `backend/data/watchlist.json` and gives category [obc, ebc, dnt], class 9–12, the income limit, and no marks or gender Criterion
- [ ] Deployed: the next deploy seeds it; an Ingestion run, the Review report and its card are checked; the post-deploy smoke check passes

## Comments

**2026-10-24 (agent):** Split out of 17 while grilling it: the Profile had only general, sc, st, obc and ews, so YASASVI's "OBC, EBC and DNT" became [obc] and wrongly failed EBC and DNT Students. Category stays the same concept with two more values, so the glossary's Core fields need no change.
