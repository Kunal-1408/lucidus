# 11: Review report and zero-Criteria review

**What to build:** The reviewer can fetch a Review report listing every Scholarship that needs review, with the Criterion that made it low and its sentence. A Scholarship extracted with no Criteria at all goes to review instead of showing as Eligible to everyone.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] `GET /api/admin/review` (admin token) lists Scholarships needing review with the weakest Criterion and its source sentence
- [ ] A Scholarship with zero Criteria is set needs review and appears in the report with that reason
- [ ] Scholarships needing review stay hidden from Match
- [ ] API-seam tests cover both reasons
- [ ] Deployed to Render; the post-deploy smoke check passes
