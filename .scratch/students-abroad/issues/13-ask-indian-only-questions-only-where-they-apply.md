# 13: Ask the four Indian-only questions only where they apply

**What to build:** A small change to when four existing questions are asked. Nothing new is built: no new question, option, field, Criterion, extraction rule or Matcher change.

| Question | Asked only when |
|---|---|
| Stream | (as today, Class 11 or 12) **and** board is `cbse`, `cisce` or `state`, or no board given |
| School type | country of residence is India, or not given |
| Parent occupation | Citizenship is `indian` or `oci`, or not given |
| Exams qualified | everyone, as today; the `nmms` option shown only when country of residence is India or not given |

Why: each value is an Indian term (Indian boards' streams; government / aided schools; Indian defence and central armed police; NMMS, a Class 8 exam for government schools in India). Asked elsewhere they add noise, and "Defence or ex-servicemen" invites a US Student with a military parent to tick it.

See spec: "Which questions appear (the grid)", "Other conditional questions", story 53. Prior art: `unaskedForResidence` and the stream rule in `frontend/src/app/profile-rules.ts`; the stream check in `backend/src/match/profile-input.ts`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The rules module asks each question only under the condition above, and clears an answer when its condition stops holding (as a change of country clears Home state today), including an `nmms` exam answer
- [x] Backend validation mirrors the conditions the way it already handles stream, with its backend-copy comment
- [x] Saved Profiles holding an answer that no longer applies load without it
- [x] The spec's "Other conditional questions" line names the four conditions
- [x] Rules-module tests and e2e cover each condition; contract test still passes
- [x] `npm run check` passes

## Scope

Only the four conditions above. Anything else found while building (a Criterion that now goes unknown, a source using these fields, a label to reword, another question that looks Indian-only) is written as a comment on this ticket and reported, not changed.

## Comments

**2026-10-26, implementer:** Built on `feat/abroad-13-indian-only-questions`.
- Rules: `unaskedIndianOnly` (stream, school type, parents' occupation) feeds `visibleQuestions`; `offeredExams` drops `nmms` abroad; `withoutUnasked` strips an unoffered exam, clearing an emptied list. `INDIAN_BOARDS` exported, backend copy in `profile-input.ts`.
- Template renders school type and parents' occupation behind `shown()`, the exam checkboxes from `offeredExams`.
- Saved Profiles: `migrateSavedProfile` drops only these four conditions' answers on load (other rules' stale answers are still dropped only at Match, as before). `profileForMatch` drops them too.
- Backend: `indianOnlyContradictions`, a 400 reason per field; the `nmms` reason reads "examsQualified nmms is only asked when countryOfResidence is IN or not given".
- Discovered, not changed:
  - A Criterion on `stream`, `schoolType`, `parentOccupation` or `examsQualified: nmms` now stays unknown for a Student not asked it, so the scholarship lands in Tell us more with a missing-field label naming a question the form no longer shows them (e.g. NMMSS `schoolType` for a Student abroad). Matcher may want to judge these as fail, or drop the label.
  - Extraction rules still produce `stream` (extraction-rules.ts:489), `schoolType` (:389), `parentOccupation` (:580) and `nmms` (:601) Criteria; unchanged.
  - Board `other` hides the stream, so a Student on an Indian board not listed (e.g. NIOS) who picks `other` loses it.
- Process: the original worktree was cleaned up after a dropped connection (no work lost); rebuilt in `.claude/worktrees/abroad-13-indian-only` from the same branch.
