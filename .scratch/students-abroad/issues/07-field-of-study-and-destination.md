# 07: Field of study groups and destination country

**What to build:** Field of study becomes a searchable list of subjects under about 11 Field of study groups, with a typed-in subject belonging to Other (no dialog). The study destination becomes any country, and matching tells home-student awards (destination is the country the Student lives in) from international-student awards.

See spec: "Profile" (field of study, destination), "Criteria and matching", glossary term Field of study group.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Profile holds a Field of study group and optionally a listed or typed subject; a typed subject counts as Other and is shown back to the Student
- [ ] The field is a searchable list with its own free-text entry; no modal dialog
- [ ] Destination is any country (ISO code); India stays an option
- [ ] Saved Profiles migrate: old `fieldOfStudy` values map to their group, old destinations map to ISO codes
- [ ] Extraction maps field-of-study wording to groups and records destination and the home / international condition
- [ ] Matching: group Criteria judged on the group; home / international judged by comparing destination with country of residence
- [ ] Backend validation rejects unknown groups and ISO codes
- [ ] e2e: a home-student and an international-student fixture each sort a Student correctly; University pointers still follow destination; contract test and Indian regression scenarios still pass
