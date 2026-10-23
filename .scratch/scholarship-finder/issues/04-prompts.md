# 04: Prompts

**What to build:** Above the three buckets, a Student sees up to three Prompts such as "Tell us your family income to check 4 more scholarships". Answering one inline updates their Profile and re-runs the Match straight away, moving the settled results into their buckets.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] For each empty Profile field, the Match counts how many results answering it would settle
- [ ] Prompts with zero impact are dropped; the top three by count are returned, most useful first
- [ ] Prompts appear above the buckets and accept an inline answer using that field's fixed list
- [ ] Answering a Prompt saves it to the Profile and re-runs the Match immediately
- [ ] Extra requirements never produce Prompts
- [ ] Matcher-seam tests cover ranking, dropping and the top-three cut
- [ ] Deployed to Render; the post-deploy smoke check passes
