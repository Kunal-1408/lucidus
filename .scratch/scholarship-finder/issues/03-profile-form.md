# 03: Full Profile form, Core fields first

**What to build:** A Student fills in a short form of the six Core fields (class, domicile state, gender, category, income band, marks) and can open "more about you" for the rest. Every field is optional, uses the fixed lists from the spec, and the Profile is remembered in the browser only. The browser also gets its Visitor ID here.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Core fields shown first; all other Profile fields behind "more about you"
- [ ] Every field optional; each uses the spec's fixed list (states and UTs, boards, streams, fields of study, destinations, income bands, categories, parent occupations, exams)
- [ ] Category and minority are separate fields; Class 10 marks and latest marks are separate; boards upcoming is captured
- [ ] Single girl child is shown only when gender is female
- [ ] School state defaults to domicile state
- [ ] Profile saved to local storage and pre-filled on reload; never sent anywhere except inside a Match request
- [ ] A Visitor ID is generated once per browser, stored, and sent as a header on API calls
- [ ] Submitting the form runs a Match and shows Results
- [ ] Deployed to Render; the post-deploy smoke check passes
