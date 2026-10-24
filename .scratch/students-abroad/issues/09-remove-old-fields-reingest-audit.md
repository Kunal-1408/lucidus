# 09: Remove the old fields, re-ingest, and audit live data

**What to build:** The old fields go. `latestMarks`, `domicileState` and `schoolState` are deleted everywhere, Overrides that name them lapse into the Review report, and a full ingestion run re-extracts every source onto the new fields. An admin endpoint and a `scripts/admin.mjs audit` command list stored Criteria no valid Profile could satisfy, so bad live data shows up without running in CI.

See spec: "Ingestion", "Audit".

**Blocked by:** 03, 04, 07

**Status:** ready-for-agent

- [ ] No code, extraction rule, LLM guide, Criterion vocabulary or Profile copy mentions `latestMarks`, `domicileState` or `schoolState`
- [ ] An Override naming a removed field is treated as lapsed and its scholarship appears in the Review report
- [ ] e2e: re-ingesting the existing fixtures yields only new-field Criteria; Indian regression scenarios still pass
- [ ] The audit endpoint lists Criteria with an unknown field, a value outside the fixed lists, or an unsupported scale or currency, each with its scholarship and sentence; covered by e2e; admin-token protected
- [ ] `scripts/admin.mjs audit` calls it and prints the result
- [ ] After deploy, the operator runs `ingest`, then `audit` and `review`, and records the outcome as a comment on this ticket

## Comments

**2026-10-25 (agent):** Wave 1 (tickets 01–04) deploys with live Scholarships still holding `class10Marks` / `latestMarks` Criteria, which no Profile the form sends can satisfy (see ticket 04's 2026-10-25 comment); this ticket's re-ingestion is what fixes them. Note for the build: `IngestionService.upsertScholarship` reuses the stored extraction when the content hash is unchanged, so a plain `ingest` run re-extracts nothing. The "full ingestion run" here needs a way to force re-extraction (for example, treating a stored extraction that names a removed field as stale, or a force flag on the run). Also delete `class10Marks` along with the three fields listed above.
