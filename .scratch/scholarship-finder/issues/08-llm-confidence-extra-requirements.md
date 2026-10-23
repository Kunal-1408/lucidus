# 08: LLM fallback, quote check, Confidence, Extra requirements

**What to build:** For fields the rules miss, one Claude Haiku call reads the Scholarship's full cleaned text and returns values, each with the exact sentence it came from. Code checks every quote, assigns Confidence, and decides what Students see: high goes live, medium goes live with a "verify on the official site" nudge, low is hidden. Conditions no Profile field can answer are kept as Extra requirements and shown on cards. A failed extraction never writes partial data.

**Blocked by:** 05, 07

**Status:** ready-for-agent

- [ ] One Haiku 5.5 call per new or changed Scholarship, over the full cleaned text capped near 15,000 characters, using structured output in the Criterion shape
- [ ] Every LLM value carries a verbatim quote; medium if the quote appears in the text and the value is an allowed option, low otherwise
- [ ] Amount text and deadline fall back to the LLM (with quote) when regex finds none
- [ ] Scholarship Confidence is its weakest Criterion's; a missing deadline does not lower it
- [ ] Medium cards show "verify on the official site"; low Scholarships are set needs review and hidden
- [ ] Extra requirements are stored with their sentence, shown on cards as "Also requires: …", never matched
- [ ] If the LLM call fails: a new Scholarship is not stored; a changed one keeps its previous version; no hash is saved, so the next run retries; the run summary reports it
- [ ] The LLM is faked in all tests except one opt-in test against the real Haiku
- [ ] The LLM is never called at match time
- [ ] Deployed to Render; the post-deploy smoke check passes
