# Spec: Scholarship Finder PoC

Status: ready-for-agent

Vocabulary follows `GLOSSARY.md`. Decisions respect `docs/adr/0001`–`0004`.

## Problem Statement

A school Student in India who wants funding for school or for undergraduate study has nowhere reliable to look. Scholarship information is scattered across government portals, scheme PDFs, corporate foundation pages and university sites, written in inconsistent prose, and there is no open public API that lists Indian scholarships. Existing databases are proprietary. A Student cannot tell which scholarships they qualify for, which they could qualify for with a little more effort, or what extra detail would settle the question, and the aggregator sites that try to help are not the official source.

For the Lucidus AI founder round, the founders need to see a simple, explainable system that solves this: it turns any official page into searchable data, matches it against a Student's details without over-engineering, and can be extended by adding data rather than code.

## Solution

A Student opens the app, fills in a short Profile (six Core fields first, the rest only when asked), and sees their results in one screen:

- **Prompts** at the top ("Tell us your family income to check 4 more scholarships"); answering one updates the Profile and re-runs the Match at once.
- **Eligible** scholarships, where every Criterion passes.
- **Within reach** scholarships, where every failing Criterion is changeable within its limit, each showing up to two Goals ("Score 80% to unlock this", "Eligible from next year: watch for the next round").
- **Tell us more** scholarships, where nothing fails but some Criteria are unknown.
- **University pointers** at the bottom when the Student's destination is the UK, USA, Canada or Australia: names only, clearly labelled as not checked against the Profile.

Every card shows the Amount text, Deadline status, last-verified date, any Extra requirements, and a link to the official site. The Student can save scholarships without signing up, and their Saved list stays readable even after a scholarship changes or stops being listed.

Behind this, an Ingestion run fetches every source on the Watchlist, skips unchanged ones, extracts Criteria with rules first and one Claude Haiku call for what the rules miss, assigns Confidence by code, and hides anything low-confidence until a person clears it with an Override. Ingestion runs on the deployed host and is triggered from Postman. Matching is plain code; the LLM never runs at match time.

## User Stories

### Profile

1. As a Student, I want to start with only a few questions (class, domicile state, gender, category, income band, marks), so that I see results quickly instead of facing a long form.
2. As a Student, I want every Profile field to be optional, so that I can see results even when I don't know some answers.
3. As a Student, I want to choose my family income from bands rather than type an exact figure, so that I can answer even if I only roughly know it.
4. As a Student, I want to give my category (General, SC, ST, OBC, EWS) and my minority status as separate answers, so that I am not forced to pick one when both apply to me.
5. As a Student, I want to give my Class 10 board marks and my latest exam marks separately, so that scholarships checking either one judge me on the right number.
6. As a Student, I want to say whether my board exams are still upcoming, so that the app knows my marks can still change.
7. As a Student in Class 11 or 12, I want to give my current stream, so that stream-specific scholarships are matched correctly.
8. As a Student, I want to give my school type (government, aided, private) and the state my school is in, so that state and school-type schemes are matched correctly.
9. As a Student, I want my school state to default to my domicile state, so that I only change it when they differ.
10. As a female Student, I want to be asked whether I am a single girl child, so that schemes for single girl children can find me, and I want that question hidden if it doesn't apply.
11. As a Student, I want to say whether I have a disability, so that disability scholarships can find me.
12. As a Student, I want to pick my parents' occupation group from a fixed list (defence or ex-servicemen, central armed police, construction worker, beedi, cine or mine worker, none), so that welfare-board scholarships can find me.
13. As a Student, I want to record qualifying exams I have passed (NMMS, Olympiad, other), so that exam-linked scholarships can find me.
14. As a Student, I want to give my intended field of study and study destination, so that degree-specific and abroad scholarships can find me.
15. As a Student, I want my Profile remembered in my browser between visits, so that I don't re-enter it each time.
16. As a Student, I want my Profile never stored on the server, so that my personal details stay on my device.

### Results

17. As a Student, I want to see scholarships where I pass every Criterion grouped as Eligible, so that I know what I can apply for now.
18. As a Student, I want scholarships I could qualify for with a small, achievable change grouped as Within reach, so that I have something to aim for.
19. As a Student, I want each Within reach card to state its Goal plainly ("Score 80% to unlock this"), so that I know exactly what to work towards.
20. As a Student whose board exams are upcoming, I want a marks shortfall of up to 5 points to count as Within reach, so that realistic targets are shown and unrealistic ones are not.
21. As a Student whose marks are final, I want a marks shortfall treated as a hard fail, so that I am not shown targets I can no longer reach.
22. As a Student in Class 9–11, I want scholarships for the next class up shown as "Eligible from next year: watch for the next round", so that I can plan ahead.
23. As a Student, I want next-year cards to stay visible even when this year's deadline has passed, so that I don't miss a scheme that recurs.
24. As a Student, I want next-year cards sorted after the other Within reach cards, so that what I can act on sooner comes first.
25. As a Class 12 Student, I want scholarships requiring UG admission to count as Within reach, so that I can see what opens once I'm admitted.
26. As a Student, I want a card with more than two Goals left out of Within reach, so that "within reach" stays honest.
27. As a Student, I want scholarships where nothing fails but some details are missing grouped as Tell us more, so that I know they might fit.
28. As a Student, I want a scholarship that is Within reach and also has unknowns to stay Within reach and list what to tell the app, so that missing details never hide or demote a result.
29. As a Student, I want up to three Prompts at the top, ranked by how many results each would settle, so that I answer the most useful questions first.
30. As a Student, I want to answer a Prompt inline and see the results update straight away, so that I immediately see what my answer unlocked.
31. As a Student, I want no Prompt that would settle nothing, so that I'm not asked pointless questions.
32. As a Student, I want scholarships within each bucket sorted by deadline, soonest first, with "not announced" ones last, so that urgent ones come first.
33. As a Student, I want scholarships whose deadline has passed removed from results (except next-year cards), so that I don't waste time on closed rounds.
34. As a Student, I want each card to show its Deadline status (open, closing soon within 30 days, not announced), so that I know how urgent it is.
35. As a Student, I want a scholarship with no announced deadline still shown, with "deadline not announced, check the official site", so that recurring schemes aren't hidden.
36. As a Student, I want each card to show the Amount text in the source's own words ("Full tuition", "₹10,000 per month"), so that I see what it really pays.
37. As a Student, I want each card to show when it was last verified, so that I can judge how fresh the information is.
38. As a Student, I want each card to link to the official site, so that I apply at the real source.
39. As a Student, I want each card to list its Extra requirements ("Also requires: top 1% in your board"), so that I see conditions the app can't check for me.
40. As a Student, I want medium-confidence cards marked "verify on the official site", so that I know to double-check them.
41. As a Student, I never want to see a low-confidence scholarship, so that I'm not misled by a bad extraction.
42. As a Student planning to study in the UK, USA, Canada or Australia, I want a list of universities there that offer international scholarships at the bottom of my results, labelled "Not checked against your profile; see their site for details", so that I have places to look myself.
43. As a Student, I want University pointers to show only names, never values or eligibility, so that I don't mistake them for checked matches.
44. As a Student with no destination or a destination outside those four countries, I want no University pointers, so that my results stay relevant.

### Saved scholarships

45. As a Student, I want to save a scholarship without signing up, so that I can come back to it.
46. As a Student, I want my Saved list to persist after reloading or closing the browser, so that saving is worth doing.
47. As a Student, I want to remove a Saved scholarship, so that my list stays tidy.
48. As a Student, I want a Saved card to show the live scholarship when it is still listed, with "updated since you saved" if it changed, so that I see current details.
49. As a Student, I want a Saved card for a scholarship that is no longer listed to show how it looked when I saved it, with a "No longer listed" badge, so that it doesn't silently vanish.
50. As a Student, I want a Saved card for a scholarship being re-checked to show my snapshot with a "Being re-checked" badge, so that I'm not shown unverified data.

### Ingestion (operator: the developer, via Postman)

51. As the operator, I want to start an Ingestion run from Postman on the deployed app, so that I can refresh data without shell access.
52. As the operator, I want the ingestion trigger to require an admin token, so that nobody else can run it.
53. As the operator, I want the trigger to return at once with a run ID, so that a long run doesn't hold the request open.
54. As the operator, I want to fetch a run's summary (fetched, unchanged, extracted, inactive, failed, needs_js, empty), so that I can see what happened.
55. As the operator, I want a second trigger during a run refused with the current run's ID, so that two runs never overlap.
56. As the operator, I want unchanged sources skipped with only their last-verified date updated, so that reruns are fast and cheap.
57. As the operator, I want a run interrupted by the host sleeping to resume naturally on the next trigger, so that a free-tier spin-down costs time, not data.
58. As the operator, I want a source that returns 404 or 410 to mark its scholarships inactive, so that removed scholarships drop out of results.
59. As the operator, I want network errors and 5xx responses to leave scholarships untouched and appear as failures, so that a flaky government server doesn't wipe data.
60. As the operator, I want a failed extraction never to write partial data, so that a scholarship is never shown as less restrictive than it really is.
61. As the operator, I want a failed extraction retried on the next run, so that transient LLM failures heal on their own.
62. As the operator, I want a page with almost no text flagged needs_js, so that I know to find its JSON endpoint.
63. As the operator, I want a source that splits into zero scholarships flagged empty without removing its existing scholarships, so that a broken split is noticed and doesn't wipe data.
64. As the operator, I want a scholarship extracted with zero Criteria sent to needs review, so that it doesn't show as Eligible to everyone.
65. As the operator, I want WorqNow's university lists refreshed on each run, keeping the previous list for a country whose fetch fails, so that University pointers stay current and never disappear by accident.

### Watchlist

66. As the operator, I want to add a source to the Watchlist through an admin endpoint, so that adding a source never needs a code change or redeploy.
67. As the operator, I want each Watchlist entry to carry the scholarship's name, provider, type and official URL, so that those fields never depend on extraction.
68. As the operator, I want to mark a source as holding one scholarship or many, so that list pages, multi-scheme PDFs and JSON feeds can be ingested.
69. As the operator, I want to split a many-scholarship source with a fixed rule per type (a JSON items path and name field, an HTML heading selector, a PDF line pattern), so that splitting is predictable and explainable.
70. As the operator, I want each scholarship from a many-scholarship source to have its own content hash, so that editing one scheme doesn't re-extract its neighbours.
71. As the operator, I want a scheme that disappears from a many-scholarship source marked inactive, so that results stay accurate.
72. As the operator, I want to list Watchlist entries with each one's last result, so that I can spot broken sources.
73. As the operator, I want to delete a Watchlist entry and have its scholarships go inactive on the next run, so that I can retire sources cleanly.
74. As the operator, I want the Watchlist seeded from a JSON file in the repo, with entries new to the file added on the next deploy, so that a fresh deploy starts with the curated list and a later one brings in additions without undoing my removals.
75. As the operator, I want about 20 curated scholarships covering every source type and edge path (PDF, many, JSON, needs_js, deadline not announced), so that the demo exercises every path.

### Extraction and Confidence

76. As the operator, I want rules (sentence filter plus regex for income, class, gender, category) tried before the LLM, so that most values are cheap and high-confidence.
77. As the operator, I want the LLM to see the scholarship's full cleaned text (capped at about 15,000 characters), so that eligibility sentences without keywords aren't missed.
78. As the operator, I want the LLM to return the exact sentence behind each value, so that every value can be checked against the page.
79. As the operator, I want Confidence set by code (high for structured or regex values, medium for an LLM value whose quote appears verbatim and fits the allowed options, low otherwise), so that the model never grades itself.
80. As the operator, I want a scholarship's Confidence to be its weakest Criterion's, and low if its official URL is missing, so that one bad value hides the record.
81. As the operator, I want amounts in lakh or crore normalised to rupees, class labels fixed, dates in ISO format, and out-of-list values dropped, so that matching compares like with like.
82. As the operator, I want income Criteria compared against the bands so that a threshold on a band edge decides and one inside a band is unknown, so that band answers never cause a wrong fail.
83. As the operator, I want conditions no Profile field can answer stored as Extra requirements with their sentence, so that they are shown but never matched or prompted for.
84. As the operator, I want the Amount text and deadline extracted (regex for dates first, the LLM with a quote as fallback), so that every card has them where the source states them.

### Review and Overrides

85. As the reviewer (Kunal), I want a Review report listing each scholarship that needs review with the Criterion that made it low and its sentence, so that I know what to check.
86. As the reviewer, I want to approve a scholarship as extracted, so that a correct but low-confidence record goes live.
87. As the reviewer, I want to supply corrected Criteria, each with its source sentence, so that I can fix a bad extraction.
88. As the reviewer, I want an Override that fails validation (sentence not on the page, value outside the fixed lists) ignored and reported with the reason, so that fixes meet the same standard as extraction.
89. As the reviewer, I want approved or corrected scholarships to go live as high confidence with who reviewed them and when, so that human checks are recorded.
90. As the reviewer, I want each Override tied to the page text it was written against, so that an old fix never silently covers new text.
91. As the reviewer, I want lapsed Overrides listed separately as "page changed", with the old and new hash and my note, so that I re-check instead of meeting an unexplained new item.
92. As the reviewer, I want to add, list and remove Overrides through admin endpoints, seeded from an overrides file in the repo, so that a fix applies on the next run without a redeploy.

### Deployment and demo

93. As the founders, I want a deployed link before the demo, so that we can try the app ourselves.
94. As the developer, I want every slice deployed as it is finished, so that deployment problems surface on day one.
95. As the developer, I want a smoke check run against the deployed URL after each deploy, so that a broken deploy is caught immediately.
96. As the developer, I want a README covering the architecture, the free-tier caveats (cold starts, open database allowlist) and the next steps, so that the founders understand what was built and what comes next.
97. As the founders, I want to watch a second Ingestion run skip unchanged pages, so that we see the system is efficient.
98. As the founders, I want to pick a scholarship URL, see it added and ingested live, and find it in results, so that we see adding a source is data, not code.

## Implementation Decisions

### Shape

- Two sibling applications in one repo, a NestJS backend and an Angular frontend, each with its own package manifest. No workspace tooling, no shared types package; the few request and response types are duplicated.
- One deployed service on Render's free tier: NestJS serves the built Angular app and the API under `/api`. One URL, no CORS.
- MongoDB Atlas free tier via Mongoose. Atlas allows connections from anywhere with a strong password, since Render's free tier has no fixed IP (a production next step).
- Secrets live in the host's environment and a local `.env` that is git-ignored: database URL, Anthropic API key, WorqNow API key, admin token.
- LLM: Claude Haiku 5.5 (`claude-haiku-5-5`) via the Anthropic SDK, with structured output for the extraction shape. Used only during ingestion (ADR-0001).
- Libraries: built-in `fetch`, `cheerio` for HTML, `pdf-parse` for PDFs, Node `crypto` for SHA-256. No headless browser, no scraping services (ADR-0002).

### Modules

- **Fetcher**: fetches a Watchlist source with a browser user-agent and a timeout; returns cleaned text (HTML with script, style, nav, header and footer removed; PDF text; parsed JSON) or a typed failure (not found, server error, network error). Flags needs_js when the cleaned text is under a few hundred characters. Injected so tests serve fixtures.
- **Splitter**: turns one source into one or more scholarship sections using the entry's fixed rule: JSON `items_path` and `name_field`; HTML `split_selector` (a heading tag, section runs to the next heading); PDF `split_pattern` (a line regex, section runs to the next match). One-scholarship entries pass through as a single section.
- **Extractor** (pure apart from the injected LLM client): from a section's cleaned text returns Criteria, Extra requirements, Amount text, deadline and per-Criterion Confidence. Pipeline: sentence filter → regex rules → one LLM call over the full cleaned text (capped near 15,000 characters) for the fields the rules missed, each with a verbatim quote → normalisation → quote check → Confidence. Any LLM failure makes the whole extraction fail.
- **Ingestion**: orchestrates a run: loads the Watchlist, fetches, splits, hashes each section, skips unchanged ones (bumping last-verified only), extracts new or changed ones, applies Overrides, computes record Confidence, and upserts each scholarship as soon as it's done. Marks scholarships inactive for 404/410 sources, deleted entries and schemes missing from a successful split. Leaves data untouched on network or 5xx errors, on failed extractions (no hash saved, so it retries) and on empty splits. Refreshes University pointers from WorqNow. Records a run summary. One run at a time.
- **Matcher** (pure): given a Profile, the visible scholarships and today's date, returns the Prompts and the Eligible, Within reach and Tell us more buckets, with Goals, Deadline status and sort order.
- **Saved**: stores Saved scholarships per Visitor with a snapshot; on read, merges live state (live, updated since saved, no longer listed, being re-checked).
- **Admin**: token-protected endpoints for the Watchlist, Overrides, ingestion trigger and run status, and the Review report.
- **Frontend**: three screens: Profile form (Core fields first), Results (Prompts, three buckets, University pointers), Saved list. Visitor ID generated client-side and sent as a header; Profile kept in local storage.

### Data

- **Scholarship**: identified by source URL plus scheme name. Fields: name, provider, type (government, corporate, university), Amount text (required), optional numeric amount and currency (display only, never ranking), deadline (optional), official URL, source URL, scheme name, content hash of its own section, last verified, status (active, inactive), Confidence, needs review, Criteria, Extra requirements, reviewed by and reviewed at when an Override applied.
- **Criterion**: field, op (`eq`, `in`, `lte`, `gte`), value, changeable, source text, Confidence. Marks Criteria name which marks they check (Class 10 or latest).
- **Extra requirement**: text and source sentence.
- **Watchlist entry**: URL, type (html, pdf, json), region (india, abroad), name, provider, scholarship type, official URL, holds (one, many), split rule for many, last result (ok, unchanged, needs_js, empty, failed, not found).
- **Override**: scholarship key, the content hash it was written against, action (approve, replace criteria), corrected Criteria when replacing, note, reviewed by.
- **University pointer**: country (UK, USA, Canada, Australia), WorqNow code, display name. Its own collection, never a Scholarship.
- **Saved scholarship**: Visitor ID, scholarship key, snapshot of the card, content hash at save time, saved at.
- **Ingestion run**: ID, start and end times, state, and counts plus per-source outcomes for the summary.
- **Profile** (never stored server-side): class (Class 9–12), domicile state (28 states, 8 UTs), school state, school type, citizenship (Indian, other), board (CBSE, CISCE, state board, IB, Cambridge, other), Class 10 marks, latest marks, boards upcoming, stream (Science, Commerce, Arts, not chosen), intended field of study (Engineering, Medicine, Science, Commerce, Arts and humanities, Law, other), destination (India, UK, USA, Canada, Australia, Germany, other), income band (under ₹1L, 1–2L, 2–2.5L, 2.5–3L, 3–4.5L, 4.5–6L, 6–8L, over ₹8L), gender (female, male, other), category (General, SC, ST, OBC, EWS), minority (yes, no), disability (yes, no), single girl child (yes, no), parent occupation (multi-select from the fixed list), exams qualified (NMMS, Olympiad, other). Core fields: class, domicile state, gender, category, income band, marks.

### Matching rules

- Visible scholarships: active, not needing review.
- Each Criterion is pass, fail or unknown. Unknown when the Profile field is empty, or when an income threshold falls inside the Student's band.
- **Eligible**: all pass. **Within reach**: at least one fail, every fail changeable within its limit, at most two Goals; unknowns are listed but don't change the bucket. **Tell us more**: no fails, at least one unknown. Otherwise hidden.
- Changeable limits: class moves up one year only (Class 9 → 10, 10 → 11, 11 → 12, never 12 → UG); marks only when boards are upcoming, gap at most 5 points, target at most 100; UG admission only for a Class 12 Student. Gender, category, minority, citizenship, domicile and income are never changeable.
- Deadline status: open, closing soon (within 30 days), closed, not announced. Closed scholarships drop out, except next-class cards, which show "Eligible from next year: watch for the next round".
- Sort within each bucket by deadline, soonest first, not announced last; next-class cards after the rest of Within reach.
- Prompts: for each empty Profile field, count the results answering it would settle; drop zero; show the top three.
- University pointers: returned with the results only when the destination is UK, USA, Canada or Australia; names only, under the label "Universities in [country] with international scholarships. Not checked against your profile; see their site for details."

### Confidence and review

- Criterion Confidence: high from a structured JSON field or a regex match; medium from the LLM when its quote appears verbatim in the section text and the value is an allowed option; low otherwise.
- Scholarship Confidence: the weakest Criterion's; low if the official URL is missing (it comes from the Watchlist entry, so this should not happen); needs review if there are zero Criteria. A missing deadline does not lower Confidence.
- High: live. Medium: live with "verify on the official site". Low: needs review, hidden.
- Overrides apply after extraction, only when their content hash equals the section's current hash. A valid approve or replace makes the record high with reviewer details. Replacement Criteria must quote a sentence present in the current section text and use allowed values; otherwise the Override is skipped and reported. Lapsed Overrides are kept and reported as "page changed".
- Review report: scholarships needing review (with the weakest Criterion and its sentence), invalid Overrides with reasons, lapsed Overrides with old and new hash and note.

### API

- `POST /api/match`: body is the Profile; returns Prompts, the three buckets and University pointers.
- `POST /api/saved`, `GET /api/saved`, `DELETE /api/saved/:id`: keyed by the Visitor ID header.
- Admin (require the admin token header):
  - `POST /api/admin/ingest`: 202 with a run ID, or 409 with the current run's ID.
  - `GET /api/admin/ingest/:runId`: the run summary.
  - `POST`, `GET`, `DELETE /api/admin/watchlist`: add (validated), list with last result, remove.
  - `POST`, `GET`, `DELETE /api/admin/overrides`.
  - `GET /api/admin/review`: the Review report.
- On startup, the Watchlist is seeded with every entry in its repo JSON file that it has never seeded before (recorded by URL), so removed entries stay removed. The Overrides collection is seeded from its repo JSON file only when empty.

### WorqNow

- Not a scholarship source (ADR-0002 amendment). Called during each Ingestion run, using its per-country university endpoints for display names, for UK, USA, Canada and Australia (well inside the 100 requests per day of a free key). Results replace that country's University pointers; a failed fetch keeps the previous list.
- If a name isn't available, it falls back to the title-cased university code, corrected by a small names file for codes that don't title-case well.
- Also used offline by the developer to discover official university pages for the Watchlist.

## Testing Decisions

- Good tests check external behaviour only: what an endpoint returns, what a Student would see, what a run summary reports. They don't assert on internal calls, Mongoose documents or private helpers, so refactors don't break them.
- **Seam 1, the backend HTTP API** (main seam): the real NestJS app against an in-memory MongoDB, with only the edges faked: the fetcher serves committed fixture pages, PDFs and JSON; the LLM client returns canned extractions; the WorqNow client returns canned university lists; the clock is pinned. Tests read like the demo: add a Watchlist entry, trigger ingestion, read the summary, call Match, check buckets. Covers ingestion and hash skipping, inactive marking, failure handling, many-scholarship splitting, empty and needs_js flags, zero-Criteria review, Overrides and lapsing, the Review report, Saved scholarships and their states, admin token checks, the 409 on concurrent runs, seeding, and University pointer visibility.
- **Seam 2, the Matcher** as a pure function: exhaustive cases for pass, fail and unknown; every bucket and the precedence between them; each changeable limit; the two-Goal cap; income bands at and inside edges; next-class cards and closed deadlines; Deadline status at the 30-day boundary; sort order; Prompt ranking and dropping.
- **Seam 3, the Extractor** as a pure function with the LLM injected: regex rules, normalisation (lakh and crore, class labels, the fixed lists), Extra requirement detection, the quote check, Confidence assignment, and LLM failure making the whole extraction fail, run against fixture copies of real NSP, myScheme, corporate and university pages.
- Tests never touch the live web. One opt-in test runs the Extractor against the real Haiku.
- A smoke check runs against the deployed URL after each deploy (Match returns, admin rejects a missing token).
- Frontend: Angular's default tests only.
- No prior art: the repo is greenfield, so the first slice sets the patterns the rest follow.

## Out of Scope

- University students, graduates and postgraduate scholarships (ADR-0003).
- Student accounts or sign-up; Visitor ID only.
- Storing the Profile on the server.
- A review UI or admin page; everything admin goes through Postman.
- A headless browser or Playwright rendering; scraping services; aggregators as sources (ADR-0002).
- An LLM splitter for pages or PDFs without clean structure.
- An LLM at match time (ADR-0001).
- Ranking by amount, targeting or value.
- Scheduled ingestion, cron jobs or proactive alerts.
- A paid always-on instance, a fixed IP or a tight database allowlist.
- Links, values or eligibility on University pointers.
- Frontend unit tests beyond Angular's defaults.
- Asking for date of birth, orphan or single-parent status, sibling counts or certificates; these become Extra requirements.

## Further Notes

- Next steps and their triggers, for the README: Playwright when a must-have needs_js page has no JSON endpoint; a local QA model when LLM cost or error rate grows; a review UI when low-confidence records pile up; smarter ranking once usage data exists; scheduled runs and alerts once Students are logged in to Lucidus; a paid instance and tight allowlist for production; an LLM splitter for unstructured multi-scheme sources.
- Free-tier caveat: the service sleeps after about 15 minutes idle, so the first request takes 30–50 seconds; wake it before the founders open the link.
- Demo, about 5 minutes: run ingestion twice and show the second run skipping unchanged pages; add a URL the founders pick and show it in results; fill a Profile and walk the Prompts and three buckets; open a Within reach card with its Goal; save two scholarships and reload.
- Pitch line: the hard part isn't matching, it's that scholarship data is scattered and unstructured, so the system turns any official page into searchable data.
- `chat discussions/handoff.md` is the original idea and is now superseded by this spec where they differ (WorqNow's role, one-scholarship-per-URL, deadline and amount handling, ingestion on the host).
