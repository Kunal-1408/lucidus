# 06: Family income for Students abroad

**What to build:** A Student living abroad enters their family's yearly income as an amount in their country's currency; a Student in India keeps the rupee bands. A Criterion in a different currency is unknown; a monthly limit is compared as twelve months.

See spec: "Profile" (family income), "Criteria and matching".

**Blocked by:** 03

**Status:** ready-for-agent

- [x] Profile gains an income amount plus ISO 4217 currency, shown only when the country isn't India, currency defaulting to the country's
- [x] Changing country clears whichever income answer no longer applies
- [x] Extraction records currency and period (monthly / yearly) on income Criteria; rupee band Criteria are unchanged
- [x] Matching: same currency compares the amount (monthly limit × 12); different currency is unknown; no exchange rates
- [x] Backend validation rejects a negative amount, an unknown currency, or an amount given for a Student in India
- [x] e2e: a USD-monthly fixture (SPDC-style) passes, fails and is unknown as expected; Indian regression scenarios still pass

## Comments

**2026-10-25 (agent):** Built on `feat/abroad-06-income-abroad`; every box is met.

Profile (both copies): `incomeAmount` is an `IncomeAmount` `{ currency, value }`, a yearly amount in an ISO 4217 code. A Criterion's value is an `IncomeLimit` `{ currency, period, value }` with `IncomePeriod` `'monthly' | 'yearly'` (backend `match/profile.ts`). The currency lists are generated from Unicode CLDR currencyData (each country's first current tender) with names from Debian's `iso_4217.json` into `frontend/src/app/currencies.ts` and `backend/src/match/currencies.ts` (`CURRENCIES`, `COUNTRY_CURRENCIES`). Bulgaria is given EUR and Panama USD. The contract test checks that the two copies are equal.

Frontend rules (`profile-rules.ts`): `unaskedForResidence` now also hides `incomeAmount` unless the country is given and isn't `INDIA`, and hides `incomeBand` abroad. A Student who gives no country keeps the band, as before. So a move into or out of India clears whichever answer no longer applies, through `withoutUnasked`. A move between two countries abroad keeps the amount in the currency the Student gave. `incomeCurrency(profile)` returns the answer's currency, else `COUNTRY_CURRENCIES[countryOfResidence]`. `checkAnswer('incomeAmount', …)` refuses an unknown currency ("Pick the currency your family income is in.") and a value that is negative or not a number ("Enter an amount of 0 or more."). The page shows a "Family income per year" fieldset with a currency select (defaulted to `incomeCurrency()`, or to a currency picked before any amount is typed, reset on a country change) and an amount input.

Backend validation (`match/profile-input.ts`): `incomeAmount()` checks the shape, an ISO 4217 code and a value of 0 or more. `incomeContradictions()` rejects an amount unless the country is given and isn't IN, and rejects a band abroad. Example reasons: `incomeAmount.currency must be an ISO 4217 currency code`, `incomeAmount is only asked when countryOfResidence is not IN`, `incomeBand is only asked when countryOfResidence is IN or not given`. The ticket didn't ask for the band rejection; it mirrors the form.

Extraction: `foreignIncomeRule` (`extraction-rules.ts`) shares `INCOME_CUE` with the rupee rule and runs only when the rupee rule doesn't match. It reads the limit through `toIncomeLimit` (`normalise.ts`), which takes a currency sign (US$, C$, A$, S$, NZ$, HK$, £, €) or an upper-case ISO code, and counts the limit monthly when the sentence says month/monthly/per mensem, else yearly. A bare "$" is left to the LLM, and a rupee figure stays an `incomeBand` limit, so Indian sources are unchanged. `normaliseValue('incomeAmount', …)` reads "USD 5000 monthly" as the LLM, a reviewer or a JSON source writes it, upper-casing the code. `incomeAmount` is `lte` and never changeable in `CRITERION_FIELDS`. The LLM field guide describes it, and `json-source.ts` lists it in `PARSED_FIELDS`.

Matching (`matcher.ts`): `compareIncomeAmount` compares only within the same currency, counting a monthly limit as twelve months, and is unknown otherwise. The missing label is "family income". A Student abroad who gives an amount in INR is judged against a rupee `incomeBand` limit (`derivedAnswer`). Any other currency is unknown against it.

Tests: rules in `profile-rules.spec.ts` ("family income"), matcher unit tests ("Matcher: family income as an amount in a currency"), extractor unit tests, the contract test's `incomeAmount` block, validation cases in `profile-validation.e2e-spec.ts`, and `backend/test/income-abroad.e2e-spec.ts` over `fixtures/abroad/usd-monthly-income.html`, which uses SPDC's wording (US$ 5,000 a month). The Indian regression scenarios pass unchanged. The overrides e2e list of Criterion fields now includes `incomeAmount`.

Not done: a GBP-yearly e2e fixture (yearly limits are covered by unit tests only). The live-data audit should flag `incomeAmount` Criteria whose currency isn't in `CURRENCIES` or whose period isn't monthly/yearly. For later tickets: 05 and 07 touch the same `Profile`, `QUESTIONS`, `unaskedForResidence`, `FIELD_GUIDE` and `FIELD_RULES` lists, so expect small merge conflicts there. The research note asks whether a period mismatch should be unknown; the spec says to compare a monthly limit as twelve months, and that is what's built.

New rules reach stored data through ticket 09's re-extraction: Scholarships already stored keep their extraction while the page's content hash is unchanged, so `incomeAmount` Criteria (a limit in another currency) reach them only when 09 forces a re-extraction; until then such a limit is still the `incomeBand` the old rules read, or nothing.

**2026-10-25 (agent, review fixes on `fix/abroad-wave-2-review`):** The spec owner accepted both extras this ticket built beyond the spec: an income amount given in INR is judged against a rupee `incomeBand` limit, and backend validation rejects (400) a rupee band sent for a Student living abroad. Story 42: `foreignIncomeRule` now takes the period from the income limit phrase alone (the words naming the income just before "income", the cue, the figure and a period right after it), not the whole sentence, so "income under £30,000 … will receive £500 a month" stays a yearly limit; unit tests cover it. A limit in another currency than the Student's income now names the currency that would settle it, as Result scales do: "family income in USD", and "family income in INR" for a rupee limit when the Student gave another currency. `IncomeLimit` is `IncomeAmount & { period }` and the Matcher reads it through `asIncomeLimit`, without the `Partial<IncomeLimit>` cast. One `RUPEES` and one `CURRENCY_CODES`, both in `match/currencies.ts`, used by `normalise.ts`, the Matcher and `profile-input.ts`. The contract test's `formMoney` import is `formCurrencies`. The income e2e expects "family income in USD" for the Dubai Student.

**2026-10-25 (agent):** Merged into `integrate/abroad-wave-2` (0704c9a), with the Wave 2 code-review fixes (9f2fa8f). Every box is met; `npm run check` passes (backend 593 tests, 1 skipped; frontend 121 tests). Status stays as is until the branch is merged to main and the deploy and smoke check pass; then set `Status: done`.
