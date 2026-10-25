import { FIXED_LISTS } from '../ingestion/normalise.js';
import {
  isObject,
  listOf,
  numberBetween,
  oneOf,
  yesNo,
} from '../input-checks.js';
import {
  BOARD_MARKS_FIELDS,
  type BoardMarksField,
  LEGACY_MARKS_FIELDS,
} from '../scholarships/criterion-fields.js';
import { INDIA } from './countries.js';
import { CURRENCIES } from './currencies.js';
import { INCOME_BANDS } from './matcher.js';
import {
  A_LEVEL_GRADES,
  type ALevelGrade,
  type BoardResult,
  type IncomeAmount,
  NO_CLASS_10_EXAM_BOARDS,
  NO_CLASS_12_EXAM_BOARDS,
  type Profile,
  RESULT_SCALE_RANGES,
  SLOT_SCALES,
} from './profile.js';

export type ProfileParseResult =
  { ok: true; profile: Profile } | { ok: false; reasons: string[] };

const CLASSES = [9, 10, 11, 12] as const;
// Every answer the form takes as yes or no, boards upcoming included.
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
  for (const field of LEGACY_MARKS_FIELDS) {
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

  for (const field of BOARD_MARKS_FIELDS) {
    if (field in raw) keep(field, boardResult(raw, field, reasons));
  }
  if ('incomeAmount' in raw) keep('incomeAmount', incomeAmount(raw, reasons));

  reasons.push(...contradictions(raw), ...boardMarksContradictions(raw));
  reasons.push(...residenceContradictions(raw), ...incomeContradictions(raw));
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

// Where the Student lives, their Citizenship (citizenship itself is a plain
// fixed list above) and where they want to study: ISO codes for the
// countries and the region, fixed lists for Home state and Residence status.
const COUNTRY_FIELDS = [
  'countryOfResidence',
  'citizenshipCountry',
  'destination',
] as const;
const RESIDENCE_ONE_OF_FIELDS = ['homeState', 'residenceStatus'] as const;

function residenceAnswers(
  raw: Record<string, unknown>,
  reasons: string[],
): [string, unknown][] {
  const answers: [string, unknown][] = [];
  for (const field of COUNTRY_FIELDS) {
    if (!(field in raw)) continue;
    const notAllowed = `${field} must be an ISO 3166-1 alpha-2 country code`;
    answers.push([
      field,
      oneOf(raw, field, FIXED_LISTS[field], reasons, field, notAllowed),
    ]);
  }
  if ('region' in raw) {
    const notAllowed = 'region must be an ISO 3166-2 region code';
    answers.push([
      'region',
      oneOf(raw, 'region', FIXED_LISTS.region, reasons, 'region', notAllowed),
    ]);
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

// Board marks: each result on a scale its slot allows (SLOT_SCALES), with a
// value inside that scale's range: whole IB points, A-level grades from A*
// to E (frontend copy: checkBoardResult in frontend/src/app/profile-rules.ts).
function boardResult(
  raw: Record<string, unknown>,
  field: BoardMarksField,
  reasons: string[],
): BoardResult | undefined {
  const answer = raw[field];
  if (!isObject(answer)) {
    reasons.push(`${field} must be a result with a scale and a value`);
    return undefined;
  }
  const scale = oneOf(
    answer,
    'scale',
    SLOT_SCALES[field],
    reasons,
    `${field}.scale`,
  );
  if (scale === undefined) return undefined;
  const label = `${field}.value`;
  if (scale === 'a_level') {
    const grades = answer.value;
    if (isALevelGrades(grades)) return { scale, value: grades };
    reasons.push(`${label} must be A-level grades from A* to E`);
    return undefined;
  }
  if (scale === 'ib_points') {
    const [min, max] = RESULT_SCALE_RANGES.ib_points;
    const points = answer.value;
    const whole = typeof points === 'number' && Number.isInteger(points);
    if (whole && points >= min && points <= max)
      return { scale, value: points };
    reasons.push(`${label} must be a whole number from ${min} to ${max}`);
    return undefined;
  }
  const [min, max] = RESULT_SCALE_RANGES[scale];
  const value = numberBetween(answer, 'value', min, max, reasons, label);
  return value === undefined ? undefined : { scale, value };
}

function isALevelGrades(value: unknown): value is ALevelGrade[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((grade) =>
      (A_LEVEL_GRADES as readonly unknown[]).includes(grade),
    )
  );
}

// The Board marks grid, as the form applies it: a Class 10 result from
// Class 10 once its boards are done, a Class 12 result only in Class 12,
// and boards upcoming only in a class that ends in board exams. A Student
// who gives no class may give both results. Board narrows it: no Class 10
// result, nor boards upcoming in a class, where the board has no exam then.
function boardMarksContradictions(raw: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  const board = raw.board as Profile['board'];
  const noClass10Exam = board && NO_CLASS_10_EXAM_BOARDS.includes(board);
  const noClass12Exam = board && NO_CLASS_12_EXAM_BOARDS.includes(board);
  const boardsAhead = raw.class === 10 && raw.boardsUpcoming === true;
  if ('class10Result' in raw && noClass10Exam) {
    reasons.push(`class10Result is not asked for the ${board} board`);
  } else if ('class10Result' in raw && (raw.class === 9 || boardsAhead)) {
    reasons.push(
      'class10Result is only asked from Class 10, once Class 10 boards are done',
    );
  }
  if ('class12Result' in raw && raw.class !== undefined && raw.class !== 12) {
    reasons.push('class12Result is only asked in Class 12');
  }
  if ('boardsUpcoming' in raw && raw.class !== 10 && raw.class !== 12) {
    reasons.push('boardsUpcoming is only asked in Class 10 or 12');
  } else if (
    'boardsUpcoming' in raw &&
    ((raw.class === 10 && noClass10Exam) || (raw.class === 12 && noClass12Exam))
  ) {
    reasons.push(`boardsUpcoming is not asked for the ${board} board`);
  }
  return reasons;
}

// Family income abroad: an amount of 0 or more in an ISO 4217 currency
// (frontend copy: checkIncomeAmount in frontend/src/app/profile-rules.ts).
const CURRENCY_CODES = CURRENCIES.map((currency) => currency.value);

function incomeAmount(
  raw: Record<string, unknown>,
  reasons: string[],
): IncomeAmount | undefined {
  const answer = raw.incomeAmount;
  if (!isObject(answer)) {
    reasons.push('incomeAmount must be an amount with a currency and a value');
    return undefined;
  }
  const currency = oneOf(
    answer,
    'currency',
    CURRENCY_CODES,
    reasons,
    'incomeAmount.currency',
    'incomeAmount.currency must be an ISO 4217 currency code',
  );
  const { value } = answer;
  const amount = typeof value === 'number' && value >= 0 ? value : undefined;
  if (amount === undefined) {
    reasons.push(
      value === undefined
        ? 'incomeAmount.value is required'
        : 'incomeAmount.value must be 0 or more',
    );
  }
  return currency === undefined || amount === undefined
    ? undefined
    : { currency, value: amount };
}

// Family income as the form asks it: a rupee band in India (or when no
// country is given), an amount abroad.
function incomeContradictions(raw: Record<string, unknown>): string[] {
  const country = raw.countryOfResidence;
  const abroad = country !== undefined && country !== INDIA;
  if ('incomeAmount' in raw && !abroad) {
    return ['incomeAmount is only asked when countryOfResidence is not IN'];
  }
  if ('incomeBand' in raw && abroad) {
    return [
      'incomeBand is only asked when countryOfResidence is IN or not given',
    ];
  }
  return [];
}

// The fields that hold an answer: absent and null both mean not given.
function given(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== null),
  );
}
