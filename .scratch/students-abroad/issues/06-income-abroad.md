# 06: Family income for Students abroad

**What to build:** A Student living abroad enters their family's yearly income as an amount in their country's currency; a Student in India keeps the rupee bands. A Criterion in a different currency is unknown; a monthly limit is compared as twelve months.

See spec: "Profile" (family income), "Criteria and matching".

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Profile gains an income amount plus ISO 4217 currency, shown only when the country isn't India, currency defaulting to the country's
- [ ] Changing country clears whichever income answer no longer applies
- [ ] Extraction records currency and period (monthly / yearly) on income Criteria; rupee band Criteria are unchanged
- [ ] Matching: same currency compares the amount (monthly limit × 12); different currency is unknown; no exchange rates
- [ ] Backend validation rejects a negative amount, an unknown currency, or an amount given for a Student in India
- [ ] e2e: a USD-monthly fixture (SPDC-style) passes, fails and is unknown as expected; Indian regression scenarios still pass
