# Official sources only, no aggregators, no headless browser

Scholarship data comes only from pages, PDFs and feeds published by providers or government portals; aggregators such as Buddy4Study are never fetched, because their data is their business and every card must link to the official source. Pages that render only with JavaScript are handled by adding the JSON endpoint they call to the watchlist, not by running a headless browser, which keeps the fetcher small and explainable. Playwright is a next step only if a must-have page has no such endpoint.

## Amendment: university pointers from WorqNow

University names from the WorqNow API are shown at the bottom of results as pointers ("Universities in the UK with international scholarships. Not checked against your profile; see their site for details.") when the Student's destination is one of WorqNow's countries. This is a deliberate, bounded exception: pointers carry no scholarship data (no value, no eligibility), are never matched, and live apart from scholarships. It does not make aggregators acceptable as scholarship sources.
