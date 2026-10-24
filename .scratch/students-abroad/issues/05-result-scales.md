# 05: Other Result scales and board narrowing

**What to build:** Students on IB, Cambridge/UK and US curricula give their results on their own scale. The board presets the scale and narrows the grid: IB and Cambridge/UK have no Class 10 result, US high school gives one GPA in the Class 12 slot. A Criterion on a different scale than the Student's answer is unknown, and a scholarship accepting alternatives across scales passes when any one passes.

See spec: "Which questions appear" (board narrowing), "Criteria and matching", glossary term Result scale.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Scales: percentage, CGPA /10 (Class 10, CBSE), GPA /4, IB points (whole numbers 0–45), A-level grades (A*–E); each range-checked, invalid answers refused
- [ ] Board presets the scale (CBSE/CISCE/State percentage; Cambridge/UK A-level grades; IB IB points; US GPA); the Student may change it; changing board or scale clears the result
- [ ] Board narrowing per the spec grid, in the rules module and in backend validation
- [ ] Extraction records the scale on each result Criterion; GCSE/IGCSE requirements and unsupported scales (weighted GPA, AP, Quebec's R score) become Extra requirements
- [ ] A scholarship listing alternatives stores one Criterion per scale as an alternatives group: passes if any member passes, fails if every judgeable member fails and none is unknown, otherwise unknown
- [ ] A Criterion on a different scale is unknown and its missing-field label names the result that would settle it
- [ ] Within reach Goals on IB points with a gap of at most 2 points; never on grades or GPA
- [ ] e2e: an IB-or-A-level fixture matches an IB Student and an A-level Student, and is unknown for a percentage-only Student; Indian regression scenarios still pass
