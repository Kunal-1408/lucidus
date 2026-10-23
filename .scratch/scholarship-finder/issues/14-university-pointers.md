# 14: University pointers from WorqNow

**What to build:** A Student planning to study in the UK, USA, Canada or Australia sees, at the bottom of their results, a list of universities there that offer international scholarships, under the label "Universities in [country] with international scholarships. Not checked against your profile; see their site for details." Names only. The list is refreshed from WorqNow on each Ingestion run and never touches Scholarships or matching.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] Each Ingestion run calls WorqNow's per-country university endpoints for UK, USA, Canada and Australia using the WorqNow key from the environment
- [ ] Results replace that country's University pointers in their own collection; a failed fetch keeps the previous list and is reported in the run summary
- [ ] Display names come from WorqNow; missing names fall back to the title-cased code, corrected by a small names file
- [ ] `POST /api/match` returns pointers only when the destination is one of the four countries
- [ ] Cards show names only: no value, no eligibility, no link; the label is shown above them
- [ ] University pointers never appear in buckets, Prompts or Saved
- [ ] WorqNow client faked in API-seam tests
- [ ] Deployed to Render; the post-deploy smoke check passes
