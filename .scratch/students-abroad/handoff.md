# Handoff: notes for later tickets

Telegraphic, per ticket. Delete a line once its ticket uses it. Detail: the ticket's `## Comments`.

## 09 remove old fields, re-ingest, audit

- delete `domicileState`: Profile ×2, `FIXED_LISTS`, `CRITERION_FIELDS`, `LEGACY_FIELDS`, `derivedAnswer` cases, `withHomeState` (03)
- delete `schoolState`: form question, `profileForMatch` fallback (03)
- delete `class10Marks`, `latestMarks` (+ `LEGACY_MARKS_FIELDS`); not on 09's list, replaced same way (04)
- delete `LEGACY_DESTINATIONS` (normalise.ts, profile-rules.ts) + Matcher `destinationCode` fallback, BUT keep `uk`/`usa`/`canada`/`australia`: University pointers read them via `legacyDestinationCode` (07); or move pointers to ISO
- lapse Overrides naming any removed field → Review report
- re-extraction is what lands new rules on stored Scholarships (content hash unchanged = old extraction kept): scales, Alternatives groups, GCSE/AP/R-score extras (05) · `incomeAmount` (06) · `fieldOfStudy`, `destination`, `destinationIsResidence` (07) · `atar`, `sat` (08)
- live today: marks Criteria unknown for everyone until re-extraction (04)
- audit: flag `incomeAmount` with unsupported currency/period (06)
- known gap: country name wrapped across lines in HTML not read, sentence splitter breaks it (07)
- known gap: "for NRIs" checks Citizenship `indian` only; no `not in` op for "not living in India" (03)

## 10 post-deploy ingestion run

- rule extraction gives `region` only for AE, AU, CA, GB, US; other regions left to LLM (03)
- "predicted ATAR of 95" reads as ATAR Criterion, not Extra requirement; Tuckwell live page does this (08, 10)
- SPDC Override in `backend/data/overrides.json` written by agent: operator confirm; lapses on 2026-27 PDF, re-point URL + re-review (10)
- watch: CBSE SGC class [12] not 11–12, JKCF fieldOfStudy science, Coca-Cola countryOfResidence US; Loran/Schulich/NTU/Gates "no criteria" without LLM (10)

## Later

- no Gulf source: AUS, Qatar Univ, RCSI name awards in `<dt>`/accordion links, not headings; Splitter takes h1–h6 only. Needs a non-heading split selector (10)
- NMSC, Melbourne, Crankstart 403 to the Fetcher (10)

## Open for the spec owner

- 11: Class 10 expected result while boards upcoming (story 20 vs 65)
- 12: Alternatives groups across fields (SAT in place of A-level/IB); Overrides can't write groups
- A-level Student below grades on IB-or-A-level page → Tell us more asking IB points, not hidden (05)
- Pearson: Tell us more for every Indian Profile without destination (07)
