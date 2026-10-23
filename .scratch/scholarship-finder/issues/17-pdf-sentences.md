# 17: Read PDF sentences across wrapped lines

**What to build:** The Extractor's rules read a PDF's sentences as the guideline states them, not line by line, so a sentence wrapped across lines never yields a wrong high-confidence Criterion. Found while verifying the demo Watchlist (15) against real NSP guideline PDFs.

**Blocked by:** 15

**Status:** needs-triage

- [ ] A sentence wrapped before a digit or a capital is read whole: the PM YASASVI school guidelines' "funding their education from Class / 9 onwards till they complete Class 12" gives Class 9–12, not Class 12 alone
- [ ] A board list naming CBSE and ICSE "including" others, or a recognised board of any kind, is not read as a CBSE/CISCE-only Criterion (Ishan Uday: "through a recognized Board of / Education including Central Board of Secondary Education (CBSE), ...")
- [ ] A sentence about how seats or quotas are shared out between boards is not a board Criterion (CSSS: "after segregating share of CBSE and ICSE on the basis of number of students passing out from various Boards")
- [ ] Numbered and lettered list items and headings still begin conditions of their own (the lower-case join added in 15 already keeps "a. ..." and "iv) ..." apart)
- [ ] Extractor tests run against fixture copies of those three guideline PDFs' text
- [ ] The three schemes are added back to `backend/data/watchlist.json` (and through the admin endpoint on the deployed app), and each yields only Criteria its guidelines state

## Comments

**2026-10-23 (agent):** Sources, for re-adding:
- PM YASASVI Top Class Education in Schools for OBC, EBC and DNT Students: `https://scholarships.gov.in/public/schemeGuidelines/3061_G.pdf`
- PM-USP Central Sector Scheme of Scholarship for College and University Students (CSSS): `https://scholarships.gov.in/public/schemeGuidelines/CSSS_GUIDLINES_07022024_updated.pdf`
- Ishan Uday Special Scholarship Scheme for NER: `https://scholarships.gov.in/public/schemeGuidelines/Guidelines_ISHAN%20UDAY_2324.pdf`

All three fetch and hash the same on repeat runs. The Reliance Foundation undergraduate FAQ PDF (`https://scholarships.reliancefoundation.org/assets/pdf/UG_FAQ.pdf`) was left out for a related reason: the disability rule reads "Students with disabilities can indicate the assistance they require" as a disabled-only condition.
