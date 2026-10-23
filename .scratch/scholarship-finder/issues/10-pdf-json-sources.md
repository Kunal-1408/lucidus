# 10: PDF and JSON sources, one or many

**What to build:** The Watchlist accepts PDF and JSON sources as well as HTML, each holding one Scholarship or many. A needs_js page can be replaced by the JSON endpoint it calls.

**Blocked by:** 09

**Status:** ready-for-agent

- [x] PDF sources are fetched and their text extracted
- [x] JSON sources are fetched and parsed; item text feeds the same Extractor; structured fields map to high confidence where they fit the fixed lists
- [x] Many PDF entries split on a line pattern; each section runs to the next matching line
- [x] Many JSON entries split by an items path and name field; each item is one Scholarship
- [x] Per-section hashing, inactive marking and the empty flag behave as for HTML
- [x] API-seam tests cover one and many for both types, including a needs_js page replaced by its JSON endpoint
- [ ] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** Built test-first on `feat/10-pdf-json-sources`. The Fetcher reads each type through `READERS` in `backend/src/ingestion/fetcher.ts`. PDF uses `pdf-parse` (new dependency, 2.4.5) with no page markers, and its `raw` is its text. JSON is parsed, and a body that isn't JSON fails the source; its `text` is one `key: value` line per value, with nested keys joined by dots. Only HTML can be flagged needs_js. New `backend/src/ingestion/json-source.ts` owns JSON text, `itemsAt` (dotted items path, `$` for the root) and `structuredCriteria`: a top-level field named after a Profile field (`class`, `incomeBand`, `gender`, `category`, `domicileState`, ...) becomes a high Criterion when `normaliseValue` accepts it. Case and spaces are slugged (`"Tamil Nadu"` → `tamil_nadu`), `true` becomes yes, and a number for `incomeBand` counts as rupees. Its sentence is that field's line in the text. `Section` now carries optional `criteria`, and Ingestion keeps a structured Criterion over an extracted one on the same field (`withStructured`). This is the only change in `upsertScholarship`; 08 should keep that line when it reworks extraction. Splitter: `SPLIT_RULES` now covers all three types. PDF: each line matching `splitPattern` starts a section that runs to the next one, and the pattern's first capture group is the scheme name (else the whole line). JSON: each item at `itemsPath` with a non-empty string `nameField` is one Scholarship, and items without one are skipped. A repeated name keeps the first for all types. Official URL always comes from the entry for PDF and JSON. Tests: `backend/test/pdf-json-sources.e2e-spec.ts`, fixtures under `backend/test/fixtures/pdf/` and `json/`. The PDFs were generated from plain-text lines (single page, Helvetica). Left unticked: the Render deploy check.
