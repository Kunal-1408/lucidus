# 12: Overrides

**What to build:** The reviewer clears a Scholarship from review without any UI, by adding an Override from Postman: approve it as extracted, or supply corrected Criteria. An Override holds only for the page text it was written against; when the page changes it lapses and the Scholarship is checked again.

**Blocked by:** 11

**Status:** ready-for-agent

- [x] Overrides collection seeded from an overrides file in the repo when empty; `POST`, `GET`, `DELETE /api/admin/overrides` behind the admin token
- [x] An Override names the Scholarship (source URL plus scheme name), the content hash it was written against, the action (approve or replace Criteria), any corrected Criteria, a note and the reviewer
- [x] Applied after extraction only when its hash matches the section's current hash; the Scholarship becomes high confidence with reviewed by and reviewed at
- [x] Replacement Criteria must quote a sentence present in the current text and use allowed values; otherwise the Override is skipped and listed in the Review report with the reason
- [x] A lapsed Override is kept and listed in the Review report as "page changed" with old and new hash and its note
- [x] A new Override takes effect on the next run without a redeploy
- [x] API-seam tests cover approve, replace, invalid and lapsed
- [ ] Deployed to Render; the post-deploy smoke check passes

## Comments

**2026-10-23 (agent, feat/12-overrides):** Built test-first at Seam 1 (`backend/test/overrides.e2e-spec.ts`, seed fixture `backend/test/fixtures/overrides/seed.json`).

New `Override` collection (`backend/src/overrides/override.schema.ts`), one per Scholarship (unique on `sourceUrl` + `schemeName`). It holds:
- `sourceUrl`, `schemeName`, `contentHash`.
- `action` (`approve` | `replace`).
- `criteria`, for replace only: `{ field, values, sourceText }[]`, with values written raw as the LLM gives them (`["female"]`, `["11", "12"]`, `["250000"]`).
- `note`, `reviewedBy`, and `reviewedAt`, which the server sets when the Override is written.
- `lastResult` (`applied` | `invalid` | `page changed`) and `problems`, which only Ingestion writes.

`OverridesController` (`backend/src/admin/overrides.controller.ts`):
- `POST /api/admin/overrides` answers 201 with the Override plus `id`. It answers 400 with `message: [reasons...]` when the shape is wrong: a missing required string, a hash that isn't 64 hex, a `field` not in `LLM_FIELDS`, no criteria on a replace or criteria on an approve, or a Scholarship that doesn't exist. It answers 409 when that Scholarship already has an Override.
- `GET` lists Overrides in insertion order.
- `DELETE /:id` answers 204, or 404.

`OverrideSeeder` seeds from `backend/data/overrides.json` (now `[]`) only when the collection is empty, in the POST body format. Invalid entries are skipped with a warning. The file path is the `OVERRIDES_FILE` provider, and the harness takes `overridesFile`.

Ingestion (`upsertScholarship`) looks up the Override for each section and checks it with `checkOverride` (`backend/src/overrides/override-check.ts`). It applies only when its hash equals the section's. Replacement Criteria go through 08's quote check and allowed-values check, now exported as `checkQuoted` from `extractor.ts`. The LLM path uses the same function. Op and changeable come from `LLM_FIELDS`. When an Override applies:
- The Scholarship's Criteria (approved as extracted, or the replacements) are stored high, with `needsReview: false`.
- `reviewedBy` and `reviewedAt` are copied from the Override. When none applies, both are `$unset`.

The skip-unchanged filter now also matches on `reviewedAt`: the Override's, or absent when there is none. A newly added or removed Override therefore re-extracts its section once on the next run, which costs one LLM call and counts as `extracted`. After that the section is `unchanged` again, and removing an Override restores the extraction as found. An invalid replace is skipped and its problems are recorded, e.g. `fieldOfStudy: sentence not in the page text` or `stream: values outside the allowed options`.

Review report: `ReviewEntry` gains two reasons. `invalid override` carries `overrideId`, `problems` and `note`; `page changed` carries `overrideId`, `oldHash`, `newHash` and `note`. `ReviewController.report()` appends them after the Scholarship entries, sorted by key, for active Scholarships only. Page changed is worked out live, from the Override's hash differing from the Scholarship's current one, and takes precedence over invalid. A lapsed Override is kept, and the re-extracted Scholarship comes back into the report under its own reason.

Small refactors:
- The input helpers `text`, `oneOf` and `isObject` moved to `backend/src/input-checks.ts`, with an optional label.
- `rejected` and `isDuplicateKey` moved to `backend/src/admin/admin-errors.ts`.
Both are now shared by the Watchlist and Overrides controllers.

Left unticked: the Render deploy check.
