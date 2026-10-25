# 10: Watchlist sources for Students abroad

**What to build:** Students abroad start seeing scholarships meant for them. The provider type gains `foundation`, and the research shortlist goes on the Watchlist: SPDC first, then CBSE Single Girl Child (newest notice), the verified Gulf sources and the UK, USA, Canada, Singapore and Australia sources. Each page-splitting selector is checked against the live page before it is committed.

See spec: "Ingestion", Further Notes, and `.scratch/students-abroad/research-watchlist-sources.md`.

**Blocked by:** 03, 04, 05, 06, 07, 08

**Status:** ready-for-agent

- [x] `foundation` is a valid provider type, accepted by the seed file parser and the admin endpoint; foundation drafts use it
- [x] SPDC is on the Watchlist with its current-year guidelines URL; an e2e test with an SPDC fixture shows an NRI / PIO / OCI Student in Class 12 with 60%+ sees it, and a Student in India doesn't
- [x] Each shortlisted source is added only after its official page and selectors are checked live; any source that can't be verified is left out and listed in a comment on this ticket
- [x] A fixture per new page-splitting source proves it splits into the expected scholarships (n/a: no page-splitting source passed the live check, see comment)
- [ ] After deploy, an ingestion run reports each new source ok, and anything landing in the Review report is noted in a comment

## Comments

**2026-10-25 (agent):** Built on `feat/abroad-10-watchlist`. `npm run check` green.

- `foundation`: one `PROVIDER_TYPES` list (watchlist-entry.schema.ts) used by Watchlist entry, Scholarship and admin parser. Loran, JKCF, Coca-Cola, Gates, Schulich use it.
- Checked live with Node fetch + the Fetcher's user-agent, then the app's own cleaner/Splitter, 2026-10-25.
- Added (11): SPDC (Algiers PDF 2025-26), CBSE SGC (`Guidelines_SGC_2025.pdf`, newest on cbse.gov.in scholar page, dated 25/09/2025), Cambridge Bursary, Imperial Bursary, Cooke College, Coca-Cola Scholars, Gates, Loran, Schulich, NTU Nanyang, Tuckwell. All `holds: one`.
- Left out, page-splitting check failed (scholarship names aren't headings; Splitter takes h1–h6 only): AUS `node/85126` (names in `<dt>`; h2/h3/h4 give Bachelor's/Master's/FAQ chunks mixing President's and Chancellor's), Qatar University (names in accordion `<a>`/`<p title>`; h3 cuts sections mid-scholarship, Talent text lands under "Conditions for Continuity"), RCSI Bahrain (accordion `<a>`; no headings per award). `holds: one` would merge Bahraini/Qatari-only awards into one Scholarship, so not added. No Gulf source on the Watchlist yet.
- Left out, fetcher can't read: NMSC guide PDF (403), Melbourne Chancellor's (403), Oxford Crankstart (403), spdcindia.gov.in (connect timeout). Not tried (research says not verified): NUS, Hamdan Award, Saudi/Kuwait/Oman, NORKA, DASA.
- SPDC: rules misread the PDF (Class 11, Nepal residence, citizenship country PK/BD, medicine only, ECR US$ 3000). Seeded a `replace` Override in `backend/data/overrides.json` against this text's hash: citizenship indian/oci/other, Class 12, Class 12 ≥60%, USD 5000 monthly, destination IN, destinationIsResidence no. `reviewedBy` says agent; operator to confirm. Lapses when the 2026-27 PDF arrives (re-point URL, re-review).
- SPDC e2e (`spdc.e2e-spec.ts`, fixture = live PDF): India Student hidden only with destination IN given; without a destination it's Tell us more (no `not in` op).
- `overrides.e2e-spec.ts` now seeds `fixtures/overrides/empty.json`; repo file no longer empty.
- Rules-only preview (fake LLM) of the other new sources: Review report "no criteria" for Loran, Schulich, NTU, Gates. Misreads to watch post-deploy: CBSE SGC class [12] (should be 11–12), JKCF fieldOfStudy science, Coca-Cola countryOfResidence US.

**2026-10-25 (agent):** Wave 3 review fixes on `fix/abroad-wave-3-review`.
- SPDC Override: citizenship `indian`/`oci` (NRI = Indian citizen abroad; PIO cards merged into OCI); `other` no longer accepted. `destinationIsResidence no` dropped: "passed grade 11th and 12th from abroad" is where they studied, no Profile field. `reviewedBy` still operator-to-confirm
- consequence: a Student in India is no longer ruled out (negative Criterion out of scope, spec): with no destination SPDC is Tell us more, with destination `IN` it can match. Acceptance line "a Student in India doesn't" now covered only as this accepted gap
- spdc e2e: OCI/PIO and NRI in UAE Class 12 75% see it; other nationality hidden; below 60% hidden; India Student without destination in Tell us more
- Provider type: GLOSSARY term added; stored keys `scholarshipType` (Watchlist) / `type` (Scholarship) kept, glossary says why

**2026-10-25 (agent):** Merged into `integrate/abroad-wave-3` (bf7218d), Wave 3 review fixes (e51cd4a). Boxes met but the post-deploy one. SPDC false positive for a Student in India with destination IN accepted by the spec owner (2026-10-25). SPDC Override awaits operator confirm. Status stays until merged to main + deploy + ingestion run; then `Status: done`.
