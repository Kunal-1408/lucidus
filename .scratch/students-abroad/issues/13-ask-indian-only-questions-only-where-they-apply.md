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

- [ ] The rules module asks each question only under the condition above, and clears an answer when its condition stops holding (as a change of country clears Home state today), including an `nmms` exam answer
- [ ] Backend validation mirrors the conditions the way it already handles stream, with its backend-copy comment
- [ ] Saved Profiles holding an answer that no longer applies load without it
- [ ] The spec's "Other conditional questions" line names the four conditions
- [ ] Rules-module tests and e2e cover each condition; contract test still passes
- [ ] `npm run check` passes

## Scope

Only the four conditions above. Anything else found while building (a Criterion that now goes unknown, a source using these fields, a label to reword, another question that looks Indian-only) is written as a comment on this ticket and reported, not changed.
