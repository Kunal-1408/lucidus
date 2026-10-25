# Handoff: notes for later tickets

Telegraphic, per ticket. Delete a line once its ticket uses it. Detail: the ticket's `## Comments`.

## 09 remove old fields, re-ingest, audit

- known gap: country name wrapped across lines in HTML not read, sentence splitter breaks it (07)
- operator after deploy: `ingest` (re-extracts all, `EXTRACTION_VERSION` 2), then `audit`, `review`; record on ticket (09)

## Any ticket changing extraction

- bump `EXTRACTION_VERSION` (ingestion.service.ts) when unchanged text should be read again; approve Overrides on re-read Scholarships lapse (09)

## 10 post-deploy ingestion run

- rule extraction gives `region` only for AE, AU, CA, GB, US; other regions left to LLM (03)
- "predicted ATAR of 95" reads as ATAR Criterion, not Extra requirement; Tuckwell live page does this (08, 10)
- SPDC Override in `backend/data/overrides.json` written by agent: operator confirm; lapses on 2026-27 PDF, re-point URL + re-review (10)
- SPDC can show to a Student in India (no negative Criterion; "studied abroad" has no field); revisit if a `not in` op lands (10 review)
- watch: CBSE SGC class [12] not 11–12, JKCF fieldOfStudy science, Coca-Cola countryOfResidence US; Loran/Schulich/NTU/Gates "no criteria" without LLM (10)

## Later

- no Gulf source: AUS, Qatar Univ, RCSI name awards in `<dt>`/accordion links, not headings; Splitter takes h1–h6 only. Needs a non-heading split selector (10)
- NMSC, Melbourne, Crankstart 403 to the Fetcher (10)

## Open for the spec owner

- A-level Student below grades on IB-or-A-level page → Tell us more asking IB points, not hidden (05)
- Pearson: Tell us more for every Indian Profile without destination (07)
