# handoff.md – Scholarship Finder PoC

Build a scholarship finder PoC for the Lucidus AI founder round: the student enters details, sees matching scholarships, and saves them. The brief is "clever and simple". Build the simplest thing that works; growth goes in the next-steps list, not the code.

## Context and principles

- Lucidus AI: gamified career-counselling app for school students, sold B2B to schools (student app plus parent dashboard).
- The founders dislike over-engineering that cements logic early. Prefer small, explainable code with clear seams to grow.
- Every line must be explainable by the developer. Minimal third-party tooling; no scraping services (no Apify), no headless browser.
- Why a scraper: there is no official public API listing Indian scholarships; existing databases are proprietary or internal. Official pages are the only open source.

## Tech stack

Matches the Lucidus stack, TypeScript throughout.

- Backend: NestJS (fetcher, ingestion command, API). Ingestion runs as a standalone NestJS CLI command.
- Database: MongoDB with Mongoose.
- Frontend: Angular (modern Angular, not legacy AngularJS).
- Libraries: built-in `fetch` or `axios`, `cheerio` for HTML, `pdf-parse` for PDFs, Node `crypto` for SHA-256 hashing, one LLM SDK.
- Secrets in `.env`, server-side only; `.env` in `.gitignore`.

## Sources

1. **WorqNow API** (abroad: UK, US, Canada, Australia): `GET https://api.worqnow.ai/education/{country}/scholarships` with `uk`, `usa`, `ca`, `au`. No key. Structured; map fields directly.
2. **Watchlist of official URLs** (India and abroad): a JSON config of entries `{url, type: html|pdf|json, source_name, region: india|abroad}`. One fetcher handles both regions. Adding a source means adding an entry, not code.

Starting seed list:

| Region | Source | What to add |
| --- | --- | --- |
| India | NSP (scholarships.gov.in) | Scheme pages and guideline PDFs |
| India | myScheme (live site) | Scholarship scheme pages |
| India | Corporate scholarships | Official pages, e.g. Kotak Kanya, Reliance Foundation |
| Abroad | Programmes WorqNow doesn't cover | Official pages, e.g. Chevening, Commonwealth, DAAD, Fulbright-Nehru |

Do not scrape aggregators such as Buddy4Study; their data is their business. Every card links only to the official source.

## Fetcher (our own, bare-bones)

1. Fetch with a browser user-agent and a timeout.
2. `type: pdf`: extract text with `pdf-parse`.
3. `type: html`: load with `cheerio`, remove `script`, `style`, `nav`, `header`, `footer`; take the remaining text.
4. `type: json`: parse the JSON directly.
5. Hash the cleaned text (SHA-256).
6. If cleaned text is under a few hundred characters, flag the entry `needs_js` and skip extraction.

JavaScript pages: no headless browser. For a `needs_js` page, find the JSON request it makes in the browser's Network tab and add that URL as a `type: json` entry. The data then arrives already structured.

## Ingestion (re-runnable command)

1. Load the watchlist and pull WorqNow.
2. Fetch, clean and hash each item. Same hash as stored: update `last_verified` only, no extraction. Missing from its source: set `status: inactive`, never delete.
3. New or changed: extract criteria.
   - WorqNow and JSON sources: direct field mapping.
   - Page text: sentence filter (keep sentences with eligibility words such as income, eligible, class, girls, category), then regex rules for income limit, class or level, gender and category.
   - One LLM call only for fields the rules missed. The schema is the output format, and the LLM must return the exact sentence it used for each value.
4. Normalise: lakh/crore to rupees, fixed class labels, ISO dates; drop values outside allowed options.
5. Assign confidence per criterion (see below).
6. Upsert into MongoDB by `source_url`.

The LLM runs only at ingestion, once per new or changed scholarship. Never at search time.

## Data model

### Scholarship record

| Field | Meaning |
| --- | --- |
| `id` | Our unique ID |
| `name`, `provider` | Scholarship name and who offers it |
| `type` | government, corporate or university |
| `amount`, `currency` | What it pays, number plus currency |
| `deadline` | Plain date; open/closing soon/closed computed at search time |
| `official_url` | Where the student applies; the card links here |
| `source_url` | Page, PDF or JSON we fetched; upsert key |
| `content_hash` | Fingerprint of cleaned text; skips unchanged pages |
| `last_verified` | Last time the source was checked; shown on the card |
| `status` | active or inactive (never deleted; may be saved) |
| `confidence` | high, medium or low; the weakest criterion's level |
| `needs_review` | true when confidence is low |
| `criteria` | Array of eligibility rules (below) |

### Criterion

Each scholarship holds a list of small rules, produced by extraction:

- `field`: student detail it checks (class, domicile state, citizenship, board, marks, degree, field of study, destination, income, gender, category).
- `op`: `eq`, `in`, `lte` or `gte`.
- `value`: what it compares against.
- `changeable`: true if the student can still change it (upcoming marks, exams, admission); false for gender, category, citizenship, domicile.
- `source_text`: the exact sentence it came from.
- `confidence`: high, medium or low.

Example: "Open to girls in Class 11, with family income below ₹3 lakh" becomes gender `eq` female, class `in` \[11\], income `lte` 300000, all not changeable.

One generic matcher evaluates every scholarship's criteria; new rules are data, not code.

### Confidence

Computed by code from how a value was extracted, never by asking the LLM to rate itself.

- **High:** from a structured field or a regex match.
- **Medium:** from the LLM, and its quoted sentence appears verbatim in the page text, and the value is an allowed option.
- **Low:** the quoted sentence isn't in the page, or the value doesn't fit the schema.

Record confidence = the weakest criterion; also low if `deadline` or `official_url` is missing. High goes live; medium goes live with a "verify on official site" nudge; low is set `needs_review` and hidden from students.

### Student profile

All fields optional: current class or level, domicile state, citizenship, board, marks (latest percentage, and whether boards are upcoming), intended degree, field of study, study destination, annual family income, gender, category (SC/ST/OBC/EWS/minority).

### Saved item

`{visitor_id, scholarship_id, snapshot, saved_at}`. The snapshot keeps the card readable if the scholarship later changes or goes inactive.

## API

- `POST /api/match`: body is the student profile. Plain code evaluates each active, non-review scholarship. Each criterion is pass, fail or unknown; unknowns never hide a result.
  - **Eligible:** all criteria pass.
  - **Tell us more:** no fails, some unknowns; return which profile fields would resolve them.
  - **Within reach:** every fail is `changeable` (cap mark gaps at about 5 points); return the gap as a goal, e.g. "Score 80% to unlock this".
  - Otherwise hidden. Closed deadlines drop out. Sort by deadline.
- `POST /api/saved`, `GET /api/saved`, `DELETE /api/saved/:id`, keyed by an anonymous `visitor_id` generated client-side and sent as a header. No sign-up.

## Frontend (Angular, three screens)

1. Profile form with the student profile fields.
2. Results in three buckets. Each card shows amount, deadline status, last-verified date and a link to the official site.
3. Saved list.

## Build order

1. Mongoose schemas and watchlist config.
2. Fetcher, tested on the seed URLs.
3. Extractor (sentence filter, rules, LLM, normalise, confidence). Hand-check 10–15 outputs.
4. Ingestion command with hash skipping.
5. Match API.
6. Save API.
7. Angular frontend.
8. Short README: architecture and next steps.

## Next steps and their triggers (not in the PoC)

| Add | When |
| --- | --- |
| Playwright rendering | A must-have `needs_js` page has no JSON endpoint |
| Local QA model for extraction | LLM cost or error rate grows |
| Review queue UI | Low-confidence records pile up |
| Smarter ranking (targeting, value) | Real usage data exists |
| Scheduled cron and proactive alerts | Students are logged in to Lucidus |

## Demo (about 5 minutes)

1. Run ingestion twice; the second run skips unchanged pages.
2. Add a scholarship URL the founders pick to the watchlist, run ingestion, and show it in results.
3. Fill a profile and walk the three buckets.
4. Open a "within reach" card showing the gap as a goal.
5. Save two scholarships and show they persist after reload.

Pitch line: the hard part isn't matching, it's that scholarship data is scattered and unstructured, so the system turns any official page into searchable data.
