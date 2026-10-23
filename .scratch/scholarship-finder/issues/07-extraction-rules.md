# 07: Extraction rules: sentence filter, regex, normalisation

**What to build:** From a Scholarship's cleaned text, the Extractor finds as many Criteria as it can with rules alone: a sentence filter followed by regex rules, with values normalised onto the fixed lists. Rule-found values are high confidence. Amount text and deadline are found by regex where the text states them.

**Blocked by:** 01,05

**Status:** ready-for-agent

- [ ] Sentence filter keeps sentences with eligibility words (income, eligible, class, girls, category and similar)
- [ ] Regex rules cover income limit, class or level, gender, category, minority, marks (naming Class 10 or latest), and the other fixed-list fields where phrasing is regular
- [ ] Lakh and crore become rupees; class labels are fixed; dates become ISO; values outside the fixed lists are dropped
- [ ] Each Criterion stores its source sentence and is marked high confidence
- [ ] Amount text and deadline are extracted by regex when present
- [ ] Ingestion uses the Extractor for every new or changed Scholarship
- [ ] Extractor-seam tests run against committed fixture copies of real NSP, myScheme and corporate pages
- [ ] Deployed to Render; the post-deploy smoke check passes
