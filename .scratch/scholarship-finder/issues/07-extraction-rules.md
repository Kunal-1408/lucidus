# 07: Extraction rules: sentence filter, regex, normalisation

**What to build:** From a Scholarship's cleaned text, the Extractor finds as many Criteria as it can with rules alone: a sentence filter followed by regex rules, with values normalised onto the fixed lists. Rule-found values are high confidence. Amount text and deadline are found by regex where the text states them.

**Blocked by:** 01,05

**Status:** ready-for-agent

- [x] Sentence filter keeps sentences with eligibility words (income, eligible, class, girls, category and similar)
- [x] Regex rules cover income limit, class or level, gender, category, minority, marks (naming Class 10 or latest), and the other fixed-list fields where phrasing is regular
- [x] Lakh and crore become rupees; class labels are fixed; dates become ISO; values outside the fixed lists are dropped
- [x] Each Criterion stores its source sentence and is marked high confidence
- [x] Amount text and deadline are extracted by regex when present
- [x] Ingestion uses the Extractor for every new or changed Scholarship
- [x] Extractor-seam tests run against committed fixture copies of real NSP, myScheme and corporate pages
- [ ] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent, feat/07-extraction-rules):** Built test-first. Pipeline in `backend/src/ingestion/extractor.ts`: split sentences → `isEligibilitySentence` filter → `FIELD_RULES` (`extraction-rules.ts`, each rule returns a raw value plus its sentence) → `normaliseValue` (`normalise.ts`, drops anything off the fixed lists) → high Confidence. Ticket 08 can slot its LLM step between the rules and normalisation and reuse `normaliseValue` for its "allowed option" check. `Extraction` now carries an optional ISO `deadline`, which Ingestion stores (and unsets when a changed page no longer states one). Rules: income (`incomeBand` lte rupees), class (widest stated range, else highest class named), gender, Class 10 and latest marks (selection-test cut-offs and pre-Class 9 marks skipped), school type (only "studying in"), and keyword rules for category, minority, disability, single girl child, citizenship, domicile state, stream, board, parent occupation and exams qualified. No rules for field of study, destination or UG admission yet (Santoor says "Enrolled in an undergraduate program" but stays a Class 12 Criterion to keep the walking skeleton's behaviour). Fixtures under `backend/test/fixtures/extractor/`: the real NSP All-Scholarships page (fetched once), and the myScheme NMMSS page rendered from myScheme's own public API JSON (the scheme page is client-rendered, so a raw fetch has no scheme text); Santoor is the corporate page. The Santoor card now shows its deadline (15 Oct 2026), so the walking-skeleton test expects `open` rather than `not_announced`.
