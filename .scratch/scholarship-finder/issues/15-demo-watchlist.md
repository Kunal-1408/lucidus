# 15: The demo watchlist (~20 scholarships)

**What to build:** The curated Watchlist the founders will see: about 12 Indian Scholarships (NSP central schemes, myScheme pages, two or three corporate) and about 8 abroad undergraduate ones (official university pages found through WorqNow, plus programme pages). It deliberately exercises every source type and edge path, and every entry is verified to ingest on the deployed app.

**Blocked by:** 06, 08, 10

**Status:** ready-for-agent

- [ ] 17 Scholarships in the seed file (the 14 here, plus CSSS and Ishan Uday from 17 and YASASVI from 18), each verified, from official sources only (no aggregators), all within Class 9–12 or undergraduate scope
- [x] Coverage includes a PDF, a many-scholarship source, a JSON source, a needs_js page replaced by its JSON endpoint, and a deadline that isn't announced
- [ ] The developer picks the sources; each is verified to fetch, split and extract
- [ ] A full Ingestion run on the deployed app processes every entry; any low-confidence ones show in the Review report
- [ ] A second run reports the unchanged pages as skipped
- [x] Fixture copies of representative pages are committed for tests
- [x] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent):** The seed (`backend/data/watchlist.json`) now has 13 entries giving 14 Scholarships. India has 8: Santoor; NMMSS via myScheme's JSON endpoint; AICTE Pragati and Saksham (degree), Top Class Education for SC, all as NSP guideline PDFs; Post-Matric for SC (socialjustice.gov.in); and the LIC Golden Jubilee 2026 PDF, a many entry split on `^\[[AB]\]\.\s*(\w+ Scholarship)` into General and Special Scholarship. Abroad has 6: U of T Pearson, York, Exeter (India), Manchester Global Futures, Sydney Scholars India, and MEXT undergraduate (Chennai consulate). All are official sources, and each fit was checked against ADR-0003. The ADR now has an amendment admitting Indian scholarships for entering undergraduate study, as Santoor already was.

Coverage: PDF (one and many), HTML, JSON, and a needs_js page replaced by its JSON endpoint: `myscheme.gov.in/schemes/nmmss` is a JavaScript shell, and the seed lists `/api/apisetu/schemes?slug=nmmss&lang=en`, which it calls and which needs no key. Deadlines are not announced on NMMSS and the NSP PDFs. MEXT's is already closed.

Verification: each entry was run twice against the live web through the built Fetcher → Splitter → rule extraction, and every section hashed the same on both passes. AICTE Pragati and York each had one transient network error, and both fetched fine on retry. The LLM step was not verified because there is no Anthropic key here; the deployed run covers it. Pearson, York, Exeter and Manchester yield no rule Criteria, so they depend on the LLM. Any of them that gets none goes to the Review report, as the test shows for Pearson.

Code changes found by verification, all test-first. A line starting in lower case now joins the previous line (PDFs wrap "up to Rs. 8.00 / lakh"), unless the previous line ends a sentence or the line starts a list item. Amount text keeps decimals and lakh/crore. The disability rule skips "reservation"/"quota" sentences but still reads "reserved for".

Sources dropped: YASASVI school, CSSS and Ishan Uday, whose wrapped lines and quota sentences still give wrong high-confidence Criteria (follow-up **17**). Also Reliance Foundation (a disability false positive), Westminster (redirects to a list of mostly postgraduate awards), UNSW (one page, several schemes), Bristol (a female-only bursary on the page), Melbourne (5xx to bots), ICAR (scanned PDF) and DEPD (a many split would run to the end of the document). That leaves 14 Scholarships rather than about 20, so the first box stays unticked until 17 adds three back.

Known gap: the Fetcher does not flag the myScheme page needs_js. Its chrome-only text is 564 characters, over the 300 threshold. A founder-picked myScheme URL would ingest with zero Criteria and land in the Review report. Worth knowing for the demo (16).

Tests: `backend/test/demo-watchlist.e2e-spec.ts` seeds the repo Watchlist and checks three things: every entry is accepted by the admin endpoint; fixture copies (`test/fixtures/demo/` plus Santoor) ingest, with LIC split in two and the NMMSS deadline not announced; and a second run reports 6 unchanged. Extractor tests use `test/fixtures/extractor/nsp-top-class-sc-guidelines.txt`.

Deploying: the deployed Watchlist is not empty, so the seeder won't add the new entries. Run `ADMIN_TOKEN=... node scripts/add-watchlist.mjs <url>`; entries already listed answer 409. Then trigger two Ingestion runs, check the Review report, and run the smoke check after merge to main. Those boxes stay unticked.

**2026-10-24 (agent):** The deploy of this seed added nothing: the seeder only filled an empty Watchlist, and the deployed one had Santoor. The seeder now adds every seed entry it hasn't seeded before (recorded by URL in `watchlist_seeded`), so the next deploy brings in the new entries. `scripts/add-watchlist.mjs` is gone. The deploy steps are now: merge to main, let Render redeploy, trigger two Ingestion runs, check the Review report, then run the smoke check.

**2026-10-24 (agent):** Smoke check against https://scholarship-finder-hafk.onrender.com with the expected commit `origin/main` (d18200a) passes all four checks: deployed commit d18200a, page served, Match returns, admin rejects a missing token. The user reports the platform tested on Render. An Ingestion run ran after this deploy (lastVerified 2026-10-23T20:19Z). Match shows 9 of the 14 Scholarships: Exeter, NMMSS, AICTE Pragati and Saksham, Top Class SC, Post-Matric SC, LIC General and Special, and Global Futures. Santoor, Pearson, York, Sydney and MEXT are not shown. They are probably in the Review report (needs review or no Criteria), and MEXT is closed. That isn't verified here: the Review report and run summaries need the admin token. The two Ingestion-run boxes stay unticked until the Review report and the second run's skipped count are checked. The first box now counts 17 Scholarships, reached through 17 and 18.
