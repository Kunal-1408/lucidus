import { FIXED_LISTS } from '../ingestion/normalise.js';
import {
  isObject,
  listOf,
  numberBetween,
  oneOf,
  yesNo,
} from '../input-checks.js';
import { INCOME_BANDS } from './matcher.js';
import type { Profile } from './profile.js';

export type ProfileParseResult =
  { ok: true; profile: Profile } | { ok: false; reasons: string[] };

const CLASSES = [9, 10, 11, 12] as const;
const MARKS_FIELDS = ['class10Marks', 'latestMarks'] as const;
const YES_NO_FIELDS = [
  'boardsUpcoming',
  'minority',
  'disability',
  'singleGirlChild',
] as const;
const ONE_OF_FIELDS = [
  'domicileState',
  'schoolState',
  'schoolType',
  'citizenship',
  'board',
  'stream',
  'fieldOfStudy',
  'destination',
  'gender',
  'category',
] as const;
const LIST_FIELDS = ['parentOccupation', 'examsQualified'] as const;

// Checks the Profile sent in a Match request against the rules the form
// applies (the frontend's copy is frontend/src/app/profile-rules.ts):
// each answer within its fixed list or range, and no answer the rest of
// the Profile rules out. Every reason is collected so a client can be
// fixed at once. An answer that is absent or null is not given; unknown
// fields are dropped.
export function parseProfile(body: unknown): ProfileParseResult {
  if (body !== undefined && !isObject(body)) {
    return { ok: false, reasons: ['The Profile must be an object'] };
  }
  const raw = given(body ?? {});
  const reasons: string[] = [];
  const profile: Record<string, unknown> = {};
  const keep = (field: string, value: unknown) => {
    if (value !== undefined) profile[field] = value;
  };

  if ('class' in raw) {
    if (CLASSES.includes(raw.class as Profile['class'] & number)) {
      profile.class = raw.class;
    } else {
      reasons.push(`class must be one of ${CLASSES.join(', ')}`);
    }
  }
  for (const field of MARKS_FIELDS) {
    if (field in raw) keep(field, numberBetween(raw, field, 0, 100, reasons));
  }
  for (const field of YES_NO_FIELDS) {
    if (field in raw) keep(field, yesNo(raw, field, reasons));
  }
  for (const field of ONE_OF_FIELDS) {
    if (field in raw)
      keep(field, oneOf(raw, field, FIXED_LISTS[field], reasons));
  }
  if ('incomeBand' in raw) {
    keep(
      'incomeBand',
      oneOf(raw, 'incomeBand', Object.keys(INCOME_BANDS), reasons),
    );
  }
  for (const field of LIST_FIELDS) {
    if (field in raw)
      keep(field, listOf(raw, field, FIXED_LISTS[field], reasons));
  }
  for (const [field, value] of residenceAnswers(raw, reasons)) {
    keep(field, value);
  }

  reasons.push(...contradictions(raw));
  reasons.push(...residenceContradictions(raw));
  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true, profile: profile as Profile };
}

// Answers the rest of the Profile rules out, as the form clears them:
// single girl child only for a female Student, a stream only from Class 11,
// Class 10 board marks not in Class 9.
function contradictions(raw: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  if ('singleGirlChild' in raw && raw.gender !== 'female') {
    reasons.push('singleGirlChild is only asked when gender is female');
  }
  if ('stream' in raw && (raw.class === 9 || raw.class === 10)) {
    reasons.push('stream is only asked from Class 11');
  }
  if ('class10Marks' in raw && raw.class === 9) {
    reasons.push('class10Marks is not asked in Class 9');
  }
  return reasons;
}

// Where the Student lives and their Citizenship (citizenship itself is a
// plain fixed list above): ISO codes for the country, region and
// Citizenship country, fixed lists for Home state and Residence status.
const COUNTRY_FIELDS = ['countryOfResidence', 'citizenshipCountry'] as const;
const RESIDENCE_ONE_OF_FIELDS = ['homeState', 'residenceStatus'] as const;
const INDIA = 'IN';

function residenceAnswers(
  raw: Record<string, unknown>,
  reasons: string[],
): [string, unknown][] {
  const answers: [string, unknown][] = [];
  for (const field of COUNTRY_FIELDS) {
    if (!(field in raw)) continue;
    if (FIXED_LISTS[field].includes(raw[field] as string)) {
      answers.push([field, raw[field]]);
    } else {
      reasons.push(`${field} must be an ISO 3166-1 alpha-2 country code`);
    }
  }
  if ('region' in raw) {
    if (FIXED_LISTS.region.includes(raw.region as string)) {
      answers.push(['region', raw.region]);
    } else {
      reasons.push('region must be an ISO 3166-2 region code');
    }
  }
  for (const field of RESIDENCE_ONE_OF_FIELDS) {
    if (field in raw)
      answers.push([field, oneOf(raw, field, FIXED_LISTS[field], reasons)]);
  }
  return answers;
}

// The answers the rest of the Profile rules out, as the form clears them:
// a region needs a country and must be one of its regions; Home state and
// Residence status only abroad (in India the region is the Home state); a
// Citizenship country only for another nationality, and a category for
// everyone else.
function residenceContradictions(raw: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  const country = raw.countryOfResidence;
  if ('region' in raw) {
    if (country === undefined) {
      reasons.push('region is only asked when countryOfResidence is given');
    } else if (
      typeof raw.region === 'string' &&
      typeof country === 'string' &&
      FIXED_LISTS.region.includes(raw.region) &&
      !raw.region.startsWith(`${country}-`)
    ) {
      reasons.push('region must be a region of countryOfResidence');
    }
  }
  for (const field of RESIDENCE_ONE_OF_FIELDS) {
    if (field in raw && (country === undefined || country === INDIA)) {
      reasons.push(`${field} is only asked when countryOfResidence is not IN`);
    }
  }
  if ('citizenshipCountry' in raw && raw.citizenship !== 'other') {
    reasons.push('citizenshipCountry is only asked when citizenship is other');
  }
  if ('category' in raw && raw.citizenship === 'other') {
    reasons.push('category is only asked when citizenship is indian or oci');
  }
  return reasons;
}

// The fields that hold an answer: absent and null both mean not given.
function given(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== null),
  );
}
