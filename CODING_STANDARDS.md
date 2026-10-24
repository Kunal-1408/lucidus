# Coding standards

Judgement calls for the reviewer. Anything `npm run check` enforces (format, lint, types, tests) is left to the tooling. `GLOSSARY.md`, `docs/adr/` and the Testing Decisions of the feature's spec (`.scratch/<feature>/spec.md`) are standards too; this file covers what they don't.

## Names speak the domain

Names in code use the `GLOSSARY.md` term, and never a word from a term's _Avoid_ list. Where an older field already uses an avoided word (`schemeName`), new code doesn't spread it further. A variable holding a Scholarship is `scholarship`, never `s`. One-letter names are fine only as parameters of a short callback.

## Mirrored types keep one name

There's no shared types package, so the frontend copies the API's types and fixed lists. A copy keeps the backend's name and values exactly: `PointerGroup` on both sides, not `UniversityPointerGroup` on one. The backend type's comment says where its copy lives, so a change to one reaches the other.

## Reject at the boundary what later code can't run

Whatever an endpoint accepts must be something the rest of the system can handle. If ingestion only splits on heading tags, the Watchlist rejects any other split selector with a clear reason. It doesn't accept the selector and leave the source to fail later. The same goes for a source type that isn't supported yet: reject it until it is.

## Replacing stored data leaves no gap

Code that replaces a stored set (a country's University pointers, a source's Scholarships) writes the new records before removing the old ones. If a write fails partway through, the old data is still there. Delete-then-insert loses everything when the insert fails.

## New rules reach stored data

A change to extraction, a Criterion field or the Profile says what happens to the Scholarships already stored. Ingestion reuses the stored extraction while a page's content hash is unchanged (`upsertScholarship` in `backend/src/ingestion/ingestion.service.ts`), so a new rule reaches live data only through a forced re-extraction. Tests that ingest fresh fixtures never show the gap; the change either re-extracts what it affects or names the gap and the ticket that closes it.

## Each concept has one home

University pointers stay apart from Scholarships everywhere, run summaries included (ADR-0002). A helper that already exists is imported, not copied: `indiaDate` lives in `backend/src/clock.ts`. Repeated steps such as "mark inactive and count it" go in one function.
