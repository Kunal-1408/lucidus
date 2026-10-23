# Scholarship Finder

A proof of concept for Lucidus AI: a school student describes themselves, sees scholarships they match or could match, and saves the ones they care about. Scholarship data comes only from official sources.

## People

**Student**:
A school student in Class 9–12 using the app. The only kind of user; university students and graduates are out of scope.
_Avoid_: User, applicant, candidate

**Visitor**:
An anonymous Student identified only by an ID their browser generates. There is no sign-up.
_Avoid_: Account, session

**Profile**:
What a Student tells us about themselves. Every field is optional.
_Avoid_: Form, details

**Core fields**:
The few Profile fields asked up front: class, domicile state, gender, category, income band and marks. Every other field is asked only through a Prompt.

## Scholarships

**Scholarship**:
A funding opportunity offered by a provider, recorded from an official source. Never deleted; it becomes inactive when its source no longer lists it.
_Avoid_: Scheme, grant, award, opportunity

**Official source**:
A page, PDF or data feed published by the scholarship's provider or a government portal. Aggregator sites are never sources.
_Avoid_: Site, aggregator, listing

**University pointer**:
A university known to offer international scholarships, listed only so the Student can look it up themselves. Never a Scholarship and never matched.
_Avoid_: University scholarship, lead, suggestion

**Watchlist**:
The list of official sources we check for scholarships. Adding a source means adding to the watchlist.
_Avoid_: Seed list, crawl list

**Ingestion run**:
One pass over the watchlist that fetches each source, skips unchanged ones, extracts the rest and records what happened.
_Avoid_: Crawl, scrape, sync

**Criterion**:
One eligibility rule of a scholarship, comparing one Profile field against a value, together with the exact sentence it came from.
_Avoid_: Requirement, condition, filter

**Extra requirement**:
A condition no Profile field can answer ("top 1% in your board", "not receiving another scholarship"). Shown on the card with its sentence, never matched and never prompted for.
_Avoid_: Note, unknown criterion

**Changeable criterion**:
A criterion the Student can still come to meet: higher marks, the next class up. Gender, category, citizenship, domicile and income are never changeable.
_Avoid_: Soft criterion, flexible field

**Confidence**:
How far we trust a criterion, judged by how its value was obtained (high, medium, low), never by asking the model. A scholarship's confidence is that of its weakest criterion.
_Avoid_: Score, accuracy

**Needs review**:
A scholarship whose confidence is low. Hidden from Students until a person checks it.
_Avoid_: Flagged, pending

**Review report**:
The list of scholarships that need review, each with the criterion that made it low and the sentence it came from.
_Avoid_: Error log, flag list

**Override**:
A person's fix for one scholarship: either approving it as extracted or supplying corrected criteria. It holds only for the exact page text it was written against; if the source changes, the override lapses and the scholarship is checked again.
_Avoid_: Patch, manual edit, exception

**Deadline status**:
Whether a scholarship is open, closing soon, closed or not announced, worked out from its deadline on the day of the search.
_Avoid_: State, availability

**Amount text**:
What a scholarship pays, in the source's own words ("Full tuition", "₹10,000 per month"). Always shown; a numeric amount is recorded only when there is one clear figure.

## Matching

**Match**:
Checking a Profile against every visible scholarship. Each criterion comes out as pass, fail or unknown.
_Avoid_: Search, filter, recommendation

**Eligible**:
Every criterion passes.

**Within reach**:
At least one criterion fails, and every failing criterion is changeable within its limit.
_Avoid_: Almost eligible, near miss

**Tell us more**:
No criterion fails and at least one is unknown because the Profile leaves that field empty.
_Avoid_: Maybe, incomplete

**Goal**:
The change that would turn a Within reach scholarship Eligible, phrased for the Student ("Score 80% to unlock this").
_Avoid_: Gap, shortfall

**Prompt**:
A question asking for one missing Profile field, together with how many results answering it would settle ("Tell us your family income to check 4 more scholarships").
_Avoid_: Nudge, question

**Saved scholarship**:
A scholarship a Visitor kept, with a snapshot of the card as it looked when saved, so it stays readable if the scholarship later changes or goes inactive.
_Avoid_: Bookmark, favourite
