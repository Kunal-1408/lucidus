# Spec: Students abroad and a tighter Profile

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. Decisions respect `docs/adr/0001`–`0004`, including the amendment to `0003` on Students living outside India. Source research for the new Watchlist entries is in `.scratch/students-abroad/research-watchlist-sources.md`.

## Problem Statement

A large share of Lucidus's Students live outside India: Indian citizens in the Gulf, OCI card holders in the UK, Students of other nationalities in Singapore or the US. The Scholarship Finder only knows a Student who lives in India. It asks for an Indian domicile state, family income in rupee bands, a category, and "latest exam marks" as a percentage. A Student in Dubai, London or Texas cannot describe themselves honestly, and the Watchlist holds no scholarship meant for them, so they see "Tell us more" or nothing at all.

The Profile is also loose for every Student. "Latest exam marks" means a different year for each class and matches nothing reliably. The marks and boards-upcoming questions show for classes they cannot apply to. A mark of 105 is quietly clamped to 100. "Other" field of study gives the Student no way to say what they want to study. The Match endpoint trusts whatever Profile it is sent. Nothing checks that the values the form sends are the values the Criteria in MongoDB use.

## Solution

A Student anywhere in the world fills in one Profile:

- Their class (Class 9–12, labelled with the equivalent grade abroad).
- The country they live in, then the state or region within it. A Student outside India also gives their Residence status there, and their Home state in India if they have one.
- Their Citizenship (Indian citizen, OCI card holder, or another nationality with its country).
- Their board, which decides which Board marks they are asked for and on which Result scale.
- Board marks only for board exams they have sat or are about to sit, with a boards-upcoming question only where a board exam is ahead of them.
- Category only when they are an Indian citizen or OCI card holder.
- Family income in rupee bands in India, or as an amount in their own currency abroad.
- Field of study by searching a list of subjects grouped into Field of study groups, or typing their own.
- The country they want to study in, from every country.

Every answer stays optional. An answer that is given must be valid for its scale and consistent with the rest of the Profile; an invalid answer shows an inline message and is not saved, and changing a field clears the answers that depended on it. The backend applies the same rules and rejects a Match request that breaks them.

The Watchlist grows with sources for Students abroad (SPDC first, then the Gulf, then the UK, USA, Canada, Singapore and Australia), on top of the existing sources. Matching never converts between Result scales or currencies: a Criterion on a different scale or currency than the Student's answer is unknown. Indian Students keep the matching they have today; the existing sources are re-extracted onto the new fields.

## User Stories

### Where the Student lives

1. As a Student, I want to pick the country I live in from every country, so that I can use the app wherever I am.
2. As a Student, I want to see the states or regions of the country I picked, so that I can say exactly where I live.
3. As a Student, I want the state question hidden until I pick a country, so that I am never shown a list that doesn't apply to me.
4. As a Student, I want my state answer cleared when I change country, so that I never keep a state from another country.
5. As a Student living in India, I want my state to count as my Home state without asking twice, so that the form stays short.
6. As a Student living abroad with family from Kerala, I want to give Kerala as my Home state, so that Kerala's schemes for students abroad can find me.
7. As a Student living abroad with no Indian Home state, I want to leave Home state empty, so that I am not forced to invent one.
8. As a Student living abroad, I want to say whether I am a citizen, a permanent resident or on a visa in that country, so that awards for residents of that country can judge me.
9. As a Student living in India, I want never to be asked about Residence status, so that the form doesn't ask questions that don't apply to me.

### Who the Student is

10. As a Student, I want to say I am an Indian citizen, an OCI card holder, or of another nationality, so that schemes for NRI, PIO and OCI students can judge me.
11. As a Student of another nationality, I want to pick which country I am a citizen of, so that awards for that country's citizens can judge me.
12. As an Indian citizen living abroad, I want to be treated as an NRI without picking "NRI" as a citizenship, so that I am not asked a confusing question.
13. As an Indian citizen or OCI card holder, I want to be asked my category, so that category-based schemes can judge me.
14. As a Student of another nationality, I want never to be asked about Indian categories, so that the form doesn't ask about categories that don't apply to me.
15. As a Student whose citizenship changes to another nationality, I want my category cleared, so that a stale answer never matches me.

### Class, board and Board marks

16. As a Student abroad, I want the class question labelled with my equivalent grade (Grade 9–12, Year 10–13), so that I pick the right one.
17. As a Student, I want to pick my board from a list that includes CBSE, CISCE, state boards, Cambridge/UK, IB, US high school and Other, so that the form knows which board exams I take.
18. As a Student, I want to be asked my Class 10 and Class 12 board results rather than "latest exam marks", so that I know exactly which result to enter.
19. As a Class 9 Student, I want not to be asked for any Board marks, so that I am not asked for a result I don't have yet.
20. As a Class 10 Student whose boards are still upcoming, I want not to be asked for Class 10 marks, so that I don't guess at a result.
21. As a Class 10 Student whose boards are done, I want to be asked for my Class 10 marks, so that I can be matched on them.
22. As a Class 11 Student, I want to be asked my Class 10 marks only, so that the form matches where I am.
23. As a Class 12 Student, I want to be asked my Class 10 marks and my Class 12 result, so that scholarships for entering undergraduate study can judge me.
24. As a Class 12 Student whose boards are upcoming, I want the Class 12 field to ask for my expected result (pre-boards or predicted), so that I can be shown scholarships within reach.
25. As a Class 12 Student whose boards are done, I want the Class 12 field to ask for my board result, so that I am matched on the real result.
26. As a Class 10 or Class 12 Student, I want to be asked whether my boards are still upcoming next to my marks, so that the two answers sit together.
27. As a Class 9 or Class 11 Student, I want not to be asked whether my boards are upcoming, so that I don't answer a question that doesn't apply to me.
28. As an IB Student, I want not to be asked for Class 10 marks, since IB has no Class 10 board exam, so that I am not asked for something that doesn't exist.
29. As an IB Student, I want to give my IB Diploma result in points out of 45, so that I don't have to convert it to a percentage.
30. As a Cambridge/UK Student, I want to give my A-level result as grades, so that I enter it the way it is written.
31. As a Cambridge/UK Student, I want not to be asked for Class 10 marks, and to see a scholarship's GCSE/IGCSE requirement as an Extra requirement, so that grades I can't be matched on are still shown.
32. As a US high-school Student, I want to give one GPA out of 4 in place of Class 12 marks, and never be asked for Class 10 marks, so that the form fits my school.
33. As a CBSE Class 10 Student, I want to give my result as CGPA out of 10 if that is how I got it, so that I am not asked to convert.
34. As a Student, I want the Result scale preset from my board but changeable, so that I can still enter a result on another scale.
35. As a Student, I want my Board marks cleared when I change board or scale, so that a result is never read on the wrong scale.
36. As a Student, I want an answer my new class rules out to be cleared when I change class, so that I never match on a contradiction.
37. As a Student, I want a result outside its scale (105%, 4.3 GPA, 46 IB points, an A-level grade of "F*") to be refused with a message, so that I can correct it rather than have it silently changed.
38. As a Student in Australia, I want to give my ATAR, so that Australian awards can judge me.
39. As a Student in the US, I want to give my SAT score as a test score separate from my board result, so that awards asking for it can judge me.

### Family income

40. As a Student in India, I want to keep picking a rupee income band, so that nothing changes for me.
41. As a Student abroad, I want to enter my family's yearly income as an amount in my country's currency, so that I don't have to convert to rupees.
42. As a Student abroad, I want a scholarship whose income limit is in another currency to show as unknown rather than pass or fail, so that I am never shown a false Eligible.
43. As a Student, I want a monthly income limit compared against my yearly income, so that schemes like SPDC can still judge me.

### Field of study and destination

44. As a Student, I want to search for a subject by typing ("marine"), so that I find it among many subjects.
45. As a Student, I want each subject to belong to a broad Field of study group, so that scholarships naming the group find me.
46. As a Student whose subject isn't listed, I want to type my own, so that I can still say what I want to study.
47. As a Student who typed my own subject, I want it shown back to me and counted as the Other group, so that I know how it is used.
48. As a Student, I want to pick the country I want to study in from every country, so that I am not limited to six.
49. As a Student who wants to study in the country I live in, I want awards for home students there to find me, so that I see local scholarships.
50. As a Student who wants to study in another country, I want awards for international students there to find me, so that I see abroad scholarships.

### Form order and behaviour

51. As a Student, I want the questions that decide other questions (class, country, citizenship, board) asked first, so that the right questions appear as I go.
52. As a Student, I want every question to stay optional, so that I can still see results when I don't know an answer.
53. As a Student, I want school type, minority, disability, single girl child, parents' occupation and exams qualified kept under "More about you", so that the first screen stays short.
54. As a returning Student, I want my saved answers converted to the new form automatically, so that I don't start again.
55. As a returning Student who gave a domicile state, I want it to become India plus that state, with the same Home state, so that my results stay the same.
56. As a returning Student who gave "latest exam marks", I want that answer dropped rather than guessed into a board year, so that I am never matched on the wrong year.

### Matching and results

57. As a Student abroad, I want to see scholarships open to students living in my country, so that the app is useful to me.
58. As an NRI, PIO or OCI Student, I want to see SPDC and the Indian schemes open to me, so that I don't miss them.
59. As a Student at a CBSE school in the Gulf, I want CBSE schemes open to NRI students to find me, so that I see them.
60. As a Student, I want a Criterion on a Result scale different from mine to come out unknown and to tell me which result would settle it, so that I can answer if I have it.
61. As a Student, I want a scholarship that accepts results on several scales ("IB 36 or AAA at A-level") to pass when any one of them passes, so that I am judged on the result I have.
62. As a Class 12 Student with an expected result just below a threshold, I want to see the scholarship as Within reach with a Goal, so that I know what to aim for.
63. As a Student, I want marks rules for years I am not asked about (Class 7 or 8 marks, GCSE grades, weighted GPA, AP, Quebec's R score) shown as Extra requirements, so that I still see them without being wrongly matched.
64. As a Student whose Residence status a scholarship checks, I want to be judged on it, so that awards for permanent residents or citizens of my country sort me correctly.
65. As an Indian Student, I want my results for the existing scholarships unchanged by this work, so that nothing I relied on breaks. One exception, by story 20: a Class 10 Student whose boards are upcoming gives no Class 10 result, so a Class 10 marks Criterion that once gave them a Within reach Goal now asks them in Tell us more.

### Validation at the backend

66. As the operator, I want the Match endpoint to reject a Profile with an out-of-range or contradictory answer, so that the API never trusts input the form would refuse.
67. As the operator, I want the rejection to name each bad field and why, so that a client can be fixed quickly.

### Watchlist and ingestion

68. As the operator, I want SPDC on the Watchlist, so that NRI, PIO and OCI Students see it.
69. As the operator, I want the Gulf, UK, USA, Canada, Singapore and Australia sources from the research added to the Watchlist, so that Students living there see local scholarships.
70. As the operator, I want a `foundation` provider type, so that foundations aren't recorded as corporate.
71. As the operator, I want extraction to record country of residence, Residence status, Citizenship country, Board marks with Result scale, ATAR, SAT, income currency and period, and Field of study group as Criteria, so that new sources can be matched.
72. As the operator, I want marks for any year other than Class 10 or Class 12 extracted as Extra requirements, so that they are never matched on the wrong field.
73. As the operator, I want the existing sources re-extracted onto the new fields, so that Indian scholarships keep matching.
74. As the operator, I want Overrides written against the removed fields to lapse and land in the Review report, so that a person re-checks them.
75. As the operator, I want a scholarship's study region to stay separate from where its Student must live, so that the two are never confused.

### Checks

76. As a developer, I want a contract test that fails when the form can send a value no Criterion uses, or a Criterion uses a value the form can't send, so that the duplicated lists never drift.
77. As a developer, I want Profile-to-bucket scenario tests through the Match endpoint against fixture scholarships, so that a change to matching shows up as a changed bucket.
78. As a developer, I want scenario tests for Indian Students that pin today's buckets, so that this work can't quietly change them.
79. As the operator, I want an audit of the live data listing stored Criteria no Profile answer could satisfy, run from the admin script, so that bad data shows up without running it in CI.

## Implementation Decisions

### Profile

- The Profile (backend and frontend copies, still duplicated on purpose) changes:
  - **Removed**: `latestMarks`, `domicileState`, `schoolState`.
  - **Added**: country of residence (ISO 3166-1 alpha-2), region (ISO 3166-2, only valid for that country), Home state (one of the 36 Indian states and union territories), Residence status (`citizen` | `permanent_resident` | `visa`, only when country is not India), Citizenship country (ISO 3166-1, only when Citizenship is another nationality).
  - **Citizenship** becomes `indian` | `oci` | `other`.
  - **Board** list becomes CBSE, CISCE, State board, Cambridge/UK, IB, US high school, Other.
  - **Board marks**: a Class 10 result and a Class 12 result, each a `{ scale, value }` pair. Scales: percentage (0–100), CGPA out of 10 (0–10), GPA out of 4 (0–4), IB points (whole numbers 0–45), A-level grades (a set of grades from A* to E). Which result slots exist depends on board (see the grid below).
  - **ATAR** (0–99.95) and **SAT** (400–1600) as separate optional answers, ATAR asked only when country is Australia, SAT only for the US high-school board or a US destination.
  - **Family income**: in India, the rupee bands as today; abroad, an amount plus an ISO 4217 currency, defaulting to the country's currency.
  - **Field of study**: a Field of study group (about 11: Engineering, Medicine and health, Natural sciences, Computing, Commerce and business, Law, Arts and humanities, Social sciences, Design and architecture, Agriculture, Education, plus Other), and optionally a subject from a curated list under the groups, or a typed-in subject that belongs to Other.
  - **Destination**: any country (ISO 3166-1).
- Every field stays optional.

### Which questions appear (the grid)

| Class | Class 10 result | Class 12 result | Boards upcoming |
|---|---|---|---|
| 9 | no | no | no |
| 10 | only when boards are done | no | yes |
| 11 | yes | no | no |
| 12 | yes | yes (expected while boards are upcoming) | yes |
| not given | yes | yes | no |

Board narrows the grid: IB and Cambridge/UK have no Class 10 result (GCSE/IGCSE requirements are Extra requirements); US high school has no Class 10 result and gives one GPA in the Class 12 slot; boards-upcoming only appears where the board has an exam at that class. Board presets the scale (CBSE/CISCE/State: percentage, with CGPA allowed for Class 10; Cambridge/UK: A-level grades; IB: IB points; US: GPA), and the Student may change it.

Other conditional questions: region needs a country; Residence status and Home state need a country other than India (for India, Home state is the region); Citizenship country needs Citizenship `other`; category needs Citizenship `indian` or `oci`; ATAR needs country Australia; single girl child needs gender female (as today); stream needs Class 11 or 12 (as today).

### Profile rules module (frontend)

- A set of pure functions that own every rule above: which questions are visible for a Profile, the label for each marks question, the answers a change clears, the range check for each answer, and migration of a saved Profile. The template only renders what these return.
- Clearing on change: country clears region, Home state and Residence status; board clears both Board marks and resets their scale; scale clears its value; class clears whatever the grid rules out; Citizenship moving to `other` clears category; Citizenship leaving `other` clears Citizenship country.
- An invalid answer is not saved; the field shows why. No clamping.
- Migration on load: `domicileState` becomes country `IN`, the matching ISO region and the same Home state; `schoolState` is dropped; `latestMarks` is dropped; Citizenship `indian` stays, `other` stays `other` with no country; `fieldOfStudy` values map to their group; destination values map to ISO codes; `india` destination becomes `IN`.
- Form order: Class, country, region, Home state (abroad), Residence status (abroad), Citizenship (and its country), board, Board marks and boards upcoming, ATAR / SAT where shown, gender, category, family income, field of study, destination. "More about you" keeps school type, minority, disability, single girl child, parents' occupation, exams qualified.
- Field of study is a searchable list with its own free-text entry; no modal dialog.

### Profile validation (backend)

- The Match endpoint validates the Profile with the same rules (ranges per scale, region belongs to country, conditional fields only present when their condition holds, valid ISO codes and currencies) using the existing input-check helpers, and answers 400 with a list of reasons naming each field. It no longer trusts the body as is.

### Criteria and matching

- New Criterion fields: country of residence (`in`), Residence status (`in`), Citizenship (`in`, now over `indian` / `oci` / `other`), Citizenship country (`in`), Home state (`in`, replacing `domicileState`), region (`in`), Class 10 result and Class 12 result (`gte`, changeable, carrying a scale), ATAR (`gte`, changeable), SAT (`gte`, changeable), income amount (`lte`, not changeable, carrying currency and period), Field of study group (`in`), destination (`in`, ISO codes), and a destination-is-residence check for home vs international awards.
- A Criterion on a different scale than the Student's answer, or a different currency, is **unknown**, and its missing-field label names the result that would settle it. Nothing is converted, except a monthly income limit, which is compared as twelve times the month.
- A scholarship accepting alternatives on several scales stores one Criterion per scale, grouped as alternatives; the group passes when any member passes, fails when all members that can be judged fail and none is unknown, and is unknown otherwise.
- An Alternatives group may span fields: a Test score accepted in place of a Class 12 result ("A-levels AAA, IB 39 points, or SAT ≥ 1450") joins the result's group. Extraction groups them when the page lists the result on several scales and the score's sentence doesn't ask it as well ("also", "as well", "in addition", "all applicants"), when the result's sentence offers the score with an "or", or when the LLM says the score stands in for the result (the LLM is asked this even about a score the rules read, whose value the rules keep); otherwise the score stands alone (a GPA and a SAT score both asked). Known gap: on a page listing the result on several scales, a score asked as well in other words ("A SAT score of 1400 is required") is still grouped; a replace Override fixes it. A failing group takes the Goal of its first member that has one; a group left unknown names every unknown member in its missing fields. An Override may group any of its Criteria.
- Within reach marks Goals keep today's rules (boards upcoming, gap of at most 5 on percentage); on other scales a Goal is offered only for percentage and IB points (gap of at most 2 points), never for grades or GPA.
- Rupee income bands and their matching, categories, class-up and UG Goals, the two-Goal cap and deadline handling are unchanged.
- The `region` on a Scholarship keeps meaning where the study happens. Where the Student must live is a Criterion on country of residence.

### Ingestion

- Extraction rules and the LLM field guide gain the new fields and lose `latestMarks`, `domicileState` and `schoolState`. Marks for any year other than Class 10 or Class 12, GCSE/IGCSE grades, and results on unsupported scales (weighted GPA, AP, Quebec's R score), become Extra requirements.
- After deploy, a full ingestion run re-extracts every source. Overrides naming a removed field are treated as lapsed and their scholarships go to the Review report.
- The Watchlist entry gains `foundation` as a provider type. New entries are added from the research shortlist, each with its page-splitting selector checked against the live page before it is committed. SPDC's source URL is re-pointed every year.

### Audit

- A new admin endpoint lists stored Criteria whose field or value no valid Profile could ever satisfy (unknown field, value outside the fixed lists, scale or currency not supported). The admin script gains an `audit` command that calls it.

## Testing Decisions

- A good test drives the system through its outside: a Profile sent to the Match endpoint and the buckets that come back, a fixture page ingested and the Criteria that come out, a Profile given to the rules module and the questions or errors it returns. Tests never reach into internals or assert on how a rule is implemented.
- **Match endpoint and admin endpoints through the e2e harness** (prior art: the walking-skeleton, extraction, many-scholarships and overrides e2e tests). Fixture pages for SPDC, one Gulf award, one UK award and one US award are ingested into the in-memory MongoDB. Scenarios cover: each new Criterion field passing, failing and unknown; unknown across scales and currencies; monthly vs yearly income; alternatives across scales; home vs international destination; Residence status; Extra requirements for other-year marks; 400 responses with reasons for invalid Profiles; Overrides on removed fields lapsing into the Review report; the audit endpoint's findings.
- **Indian regression scenarios** in the same harness pin today's buckets for a handful of Indian Profiles (for example, Class 12 in Kerala with 85%; Class 10 SC girl in Bihar with income under ₹1 lakh), using the existing fixture pages re-extracted onto the new fields.
- **Matcher unit tests** keep their current role for fine-grained matching rules (prior art: the existing matcher spec), extended for scales, currencies and alternatives.
- **Frontend Profile rules module** (prior art: the existing profile-fields spec): the full grid, board narrowing, every clearing rule, every range check, and migration of saved Profiles.
- **Form ↔ Criteria contract test** in the backend, importing the frontend's fixed lists: every value the form can send for a field is accepted by that field's Criterion vocabulary, and every value extraction can produce is one the form can send.
- All of the above run in `npm run check`. The live-data audit does not; it is run by hand through the admin script.

## Out of Scope

- Converting results between scales or incomes between currencies.
- University students and graduates; postgraduate and mid-degree scholarships.
- Scholarships whose eligibility hinges only on admission to a named university (those stay University pointers).
- Weighted GPA, AP, Quebec's R score and other scales beyond those listed, except as Extra requirements.
- A school-state answer separate from where the Student lives.
- An expected Class 10 result (pre-boards or predicted) while boards are upcoming (ticket 11).
- A negative Criterion operator ("not living in India"); "for NRIs" checks Citizenship only, and a Student in India without a destination sees such a scholarship in Tell us more.
- Any account or server-side storage of the Profile.
- Sources the research could not verify on an official page (Saudi Arabia, Kuwait, Oman, Hamdan award, Oxford Crankstart, NUS) until an official page is found.

## Further Notes

- The research file flags SPDC's official portal as unreachable during research; the shortlist uses an embassy copy of the guidelines, which must be re-checked each year.
- Several deadlines in the research shortlist have already passed; they still go on the Watchlist, since Deadline status handles closed rounds and the schemes recur.
- The CBSE Single Girl Child notice found is the 2024-25 one; check for a newer notice before adding it.
