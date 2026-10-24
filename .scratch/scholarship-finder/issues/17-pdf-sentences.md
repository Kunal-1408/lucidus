# 17: Read PDF sentences across wrapped lines

**What to build:** The Extractor's rules read a PDF's sentences as the guideline states them, not line by line, and never read a sentence about renewal or about sharing out places as a condition. So a sentence wrapped across lines, or one that shares places between groups, never yields a wrong high-confidence Criterion. Found while verifying the demo Watchlist (15) against real NSP guideline PDFs.

**Blocked by:** 15

**Status:** ready-for-agent

- [ ] A line starting with a digit or a capital joins the line above only when that line ends in a comma or in a word that can't end a sentence (of, the, and, from, to, in, for, by, with, including, "Class", ...). Headings stay apart: "3. Allocation of Scholarship" is not joined to "The total number ..." below it, nor is anything joined to "2. ELIGIBILITY:"
- [ ] Numbered and lettered list items still begin conditions of their own (the lower-case join added in 15 already keeps "a. ..." and "iv) ..." apart)
- [ ] "from Class X ... till/until/up to ... Class Y" is a class range: PM YASASVI school's "funding their education from Class / 9 onwards till they complete Class 12" gives Class 9–12, not Class 12 alone
- [ ] A sentence that shares out places is read by no rule: a percentage or ratio of scholarships, slots or seats with reserved, earmarked, allotted, divided, share, segregating or "in the ratio of". One filter before the rules, not more per-rule skip lists. A plain "reserved for students with disabilities" (no share) is still a condition, as 15 set up. Cases:
  - YASASVI "At least 30% of these scholarships are reserved for girls" gives no marks (nor gender) Criterion
  - CSSS "after segregating share of CBSE and ICSE on the basis of number of students passing out from various Boards" gives no board Criterion
  - CSSS "distributed amongst pass outs of the Humanities, / Science and Commerce streams in the ratio of 3:3:1" gives no stream Criterion
- [ ] A sentence about renewal is read by no rule: CSSS "For renewal of scholarship in each year of study, besides getting at least 50% marks ..." gives no marks Criterion
- [ ] A board sentence naming a recognised or any board, or listing boards after "including", gives no board Criterion (Ishan Uday: "through a recognized Board of / Education including Central Board of Secondary Education (CBSE), ...")
- [ ] A category sentence naming a category outside the Profile's options gives no category Criterion: YASASVI's "OBC, EBC and DNT" no longer gives [obc] (EBC and DNT are added in 18)
- [ ] Extractor tests run against fixture text copies of the three guideline PDFs (as `test/fixtures/extractor/nsp-top-class-sc-guidelines.txt` is)
- [ ] CSSS and Ishan Uday are added back to `backend/data/watchlist.json`, and each yields only Criteria its guidelines state. YASASVI is added back in 18
- [ ] Deployed: the next deploy seeds the two new entries. Two Ingestion runs, then the Review report and the CSSS and Ishan Uday cards are checked: when the rules find nothing for a field the LLM is asked, and it could still give a wrong medium Criterion (e.g. board [cbse, cisce]). Fix any with a seeded Override. The post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** Sources, for re-adding:
- PM YASASVI Top Class Education in Schools for OBC, EBC and DNT Students: `https://scholarships.gov.in/public/schemeGuidelines/3061_G.pdf`
- PM-USP Central Sector Scheme of Scholarship for College and University Students (CSSS): `https://scholarships.gov.in/public/schemeGuidelines/CSSS_GUIDLINES_07022024_updated.pdf`
- Ishan Uday Special Scholarship Scheme for NER: `https://scholarships.gov.in/public/schemeGuidelines/Guidelines_ISHAN%20UDAY_2324.pdf`

All three fetch and hash the same on repeat runs. The Reliance Foundation undergraduate FAQ PDF (`https://scholarships.reliancefoundation.org/assets/pdf/UG_FAQ.pdf`) was left out for a related reason: the disability rule reads "Students with disabilities can indicate the assistance they require" as a disabled-only condition.

**2026-10-24 (agent):** Grilled with the user. Running the current rules over the three PDFs gives seven wrong high Criteria, not three: YASASVI class [12], latestMarks 30 (a girls' quota) and category [obc] (EBC and DNT have no Profile option); CSSS board [cbse, cisce], latestMarks 50 (renewal) and stream [science, commerce] (a share ratio that also lost Humanities to a wrap); Ishan Uday board [cbse, cisce]. Each now has a box. Decisions: join on a dangling last word or comma rather than line length; one filter for place-sharing sentences; renewal and place-sharing sentences recorded as not Criteria in `GLOSSARY.md`; EBC/DNT and YASASVI's re-add split into 18. The Reliance FAQ stays out of scope (a capability sentence, not a wrapped line).
