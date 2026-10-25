# 09: Remove the old fields, re-ingest, and audit live data

**What to build:** The old fields go. `latestMarks`, `domicileState` and `schoolState` are deleted everywhere, Overrides that name them lapse into the Review report, and a full ingestion run re-extracts every source onto the new fields. An admin endpoint and a `scripts/admin.mjs audit` command list stored Criteria no valid Profile could satisfy, so bad live data shows up without running in CI.

See spec: "Ingestion", "Audit".

**Blocked by:** 03, 04, 07

**Status:** ready-for-agent

- [x] No code, extraction rule, LLM guide, Criterion vocabulary or Profile copy mentions `latestMarks`, `domicileState` or `schoolState`
- [x] An Override naming a removed field is treated as lapsed and its scholarship appears in the Review report
- [x] e2e: re-ingesting the existing fixtures yields only new-field Criteria; Indian regression scenarios still pass
- [x] The audit endpoint lists Criteria with an unknown field, a value outside the fixed lists, or an unsupported scale or currency, each with its scholarship and sentence; covered by e2e; admin-token protected
- [x] `scripts/admin.mjs audit` calls it and prints the result
- [ ] After deploy, the operator runs `ingest`, then `audit` and `review`, and records the outcome as a comment on this ticket

## Comments

**2026-10-25 (agent):** Wave 1 (tickets 01–04) deploys with live Scholarships still holding `class10Marks` / `latestMarks` Criteria, which no Profile the form sends can satisfy (see ticket 04's 2026-10-25 comment); this ticket's re-ingestion is what fixes them. Note for the build: `IngestionService.upsertScholarship` reuses the stored extraction when the content hash is unchanged, so a plain `ingest` run re-extracts nothing. The "full ingestion run" here needs a way to force re-extraction (for example, treating a stored extraction that names a removed field as stale, or a force flag on the run). Also delete `class10Marks` along with the three fields listed above.

**2026-10-25 (agent):** built on `feat/abroad-09-remove-old-fields`.
- removed: `latestMarks`, `class10Marks`, `domicileState`, `schoolState` (+ `LEGACY_MARKS_FIELDS`, `LEGACY_FIELDS`, `LEGACY_DESTINATIONS`, `legacyDestinationCode`, school-state question, `profileForMatch` fallback, Matcher fallbacks). Match request: old fields now dropped as unknown, not 400
- University pointers: `POINTER_COUNTRY_CODES` (worqnow.ts) replaces the legacy map
- forced re-extraction: `EXTRACTION_VERSION = 2` (ingestion.service.ts), `extractionVersion` on Scholarship; stored extraction reused only on same hash AND same version. Plain `ingest` after deploy re-extracts everything once (one LLM call per Scholarship). Bump the constant when a release changes extraction of unchanged text
- Override result `lapsed` (sticky until replaced): replace naming a field no Criterion checks (`<field>: field removed`), or approve whose extraction was read again on same text (`extraction read again since the review`). Review report reason `override lapsed`. Live Overrides: none (data/overrides.json empty)
- audit: `GET /api/admin/audit` (criterion-audit.ts), active Scholarships only; problems: unknown field, value outside the fixed list, value outside the range, unsupported Result scale, unsupported currency, unsupported income period. Low Criteria: field checked only (raw LLM values, already in Review report)
- `scripts/admin.mjs audit`
- saved-Profile migration on load now only drops unknown questions and a non-country destination; old domicile/marks/destination names no longer mapped (Visitors not seen since Wave 1/2 lose those answers)
- removed field names stay in tests only, as stored-data inputs

**2026-10-25 (agent):** Wave 3 review fixes on `fix/abroad-wave-3-review`.
- saved-Profile migration restored (spec "Migration on load", stories 54/55): `domicileState` → `IN` + ISO region (= Home state); old destinations `india`/`uk`/`usa`/`canada`/`australia`/`germany` → ISO codes; `class10Marks` → `class10Result` percentage; `latestMarks`, `schoolState` dropped. Old keys live only in `migrateSavedProfile` (`OLD_DESTINATIONS` private) and its tests. Previous bullet above superseded
- audit: low Criteria now checked by value too, read as approve would (`approvedValue`); unreadable raw value → new problem `raw value outside the allowed options`
- audit entry: `id`/`name`/`schemeName` → `scholarshipId`/`scholarshipName`/`sourceUrl` (name = the Override key's name)
- one home: `CLASSES`, `INCOME_PERIODS`, `isInRange` in match/profile.ts; `UG` exported from matcher.ts; audit, normalise, profile-input use them
- `SkippedResult` + `isSkipped` (override.schema.ts): invalid/lapsed handled once in ingestion, override-check, review report (`SkippedOverrideEntry`, replaces Invalid/LapsedOverrideEntry; JSON unchanged)
- reuse decision: `reusable()` in ingestion.service.ts returns `ExtractionOrigin` (`stored` / `read again` / `new text`, extractor.ts); `checkOverride` takes the origin instead of `readAgain`
- kept: approve Overrides lapse on re-extraction (spec owner's call)
