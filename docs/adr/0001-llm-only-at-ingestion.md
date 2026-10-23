# The LLM runs only at ingestion, never at match time

Criteria are extracted once per new or changed source page and stored; matching a Student's Profile is plain code over those stored criteria. We chose this over asking an LLM at search time so that matching is free, instant, deterministic and explainable criterion by criterion, and so that model cost scales with how often sources change, not with how many Students search.
