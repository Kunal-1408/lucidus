# Handoff: notes for later tickets

Telegraphic, per ticket. Delete a line once its ticket uses it. Detail: the ticket's `## Comments`.

## 09 remove old fields, re-ingest, audit

- known gap: country name wrapped across lines in HTML not read, sentence splitter breaks it (07)
- known gap: "for NRIs" checks Citizenship `indian` only; no `not in` op for "not living in India" (03)
- operator after deploy: `ingest` (re-extracts all, `EXTRACTION_VERSION` 2), then `audit`, `review`; record on ticket (09)

## Any ticket changing extraction

- bump `EXTRACTION_VERSION` (ingestion.service.ts) when unchanged text should be read again; approve Overrides on re-read Scholarships lapse (09)

## 10 Watchlist for Students abroad

- `foundation` provider type missing; abroad fixtures use `corporate` for now (08)
- rule extraction gives `region` only for AE, AU, CA, GB, US; other regions left to LLM (03)
- "predicted ATAR of 95" reads as ATAR Criterion, not Extra requirement; research file says otherwise (08)

## Open for the spec owner

- 11: Class 10 expected result while boards upcoming (story 20 vs 65)
- 12: Alternatives groups across fields (SAT in place of A-level/IB); Overrides can't write groups
- A-level Student below grades on IB-or-A-level page → Tell us more asking IB points, not hidden (05)
- Pearson: Tell us more for every Indian Profile without destination (07)
