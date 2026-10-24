# 18: EBC and DNT categories

**What to build:** A Student can say they are EBC (Economically Backward Class) or DNT (Denotified, Nomadic and Semi-Nomadic Tribes), and a Scholarship for those groups gets a category Criterion naming them. That lets PM YASASVI school go back on the Watchlist with the Criteria its guidelines state.

**Blocked by:** 17

**Status:** ready-for-agent

- [x] `ebc` and `dnt` are category options in the Profile, the profile form, value normalisation, the category rule's options and the LLM field guide. EBC is not EWS
- [x] Category stays never changeable
- [x] "OBC, EBC and DNT students" gives category [obc, ebc, dnt]
- [x] PM YASASVI Top Class Education in Schools for OBC, EBC and DNT Students (`https://scholarships.gov.in/public/schemeGuidelines/3061_G.pdf`) is added back to `backend/data/watchlist.json` and gives category [obc, ebc, dnt], class 9–12, the income limit, and no marks or gender Criterion
- [ ] Deployed: the next deploy seeds it; an Ingestion run, the Review report and its card are checked; the post-deploy smoke check passes

## Comments

**2026-10-24 (agent):** Split out of 17 while grilling it: the Profile had only general, sc, st, obc and ews, so YASASVI's "OBC, EBC and DNT" became [obc] and wrongly failed EBC and DNT Students. Category stays the same concept with two more values, so the glossary's Core fields need no change.

**2026-10-24 (agent):** Added `ebc` and `dnt` to the Profile, the profile form, `FIXED_LISTS` (so the LLM field guide lists them too) and the category rule. EBC (Economically Backward Class) and EWS are matched apart. The rule's `beyondOptions` guard from 17 now names only the categories still without an option (MBC, SEBC, Extremely/Most Backward, VJNT, Vimukta), so "OBC and MBC students" still gives no Criterion. YASASVI school is back on the Watchlist (16 entries), and its fixture gives class 9–12, ₹2.5 lakh and [obc, ebc, dnt]. The Deployed box stays open until the next deploy is checked.
