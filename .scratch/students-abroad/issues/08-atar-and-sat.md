# 08: ATAR and SAT

**What to build:** A Student in Australia can give their ATAR, and a Student on the US high-school board or heading to the US can give their SAT score, as answers separate from Board marks. Both are extracted and matched.

See spec: "Profile" (ATAR, SAT).

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] ATAR (0–99.95) shown only when the country is Australia; SAT (400–1600) only for the US high-school board or a US destination; each cleared when its condition stops holding
- [ ] Backend validation enforces the same ranges and conditions
- [ ] Extraction produces ATAR and SAT Criteria (`gte`, changeable)
- [ ] e2e: an ATAR fixture and a SAT fixture each pass, fail and are unknown as expected
