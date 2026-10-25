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
} from '../scholarships/criterion-fields.js';
import { INDIA } from './countries.js';
import { CURRENCY_CODES } from './currencies.js';
import { INCOME_BANDS } from './matcher.js';
import {
  type BoardResult,
  CLASSES,
  type IncomeAmount,
  isALevelGrades,
  isInRange,
  NO_CLASS_10_EXAM_BOARDS,
  NO_CLASS_12_EXAM_BOARDS,
  type Profile,
  RESULT_SCALE_RANGES,
  SLOT_SCALES,
  TEST_SCORE_RANGES,
  type TestScoreField,
} from './profile.js';

export type ProfileParseResult =
  { ok: true; profile: Profile } | { ok: false; reasons: string[] };

// Every answer the form takes as yes or no, boards upcoming included.
const YES_NO_FIELDS = [
  'boardsUpcoming',
  'minority',
  'disability',
  'singleGirlChild',
] as const;
const ONE_OF_FIELDS = [
  'schoolType',
  'citizenship',
  'board',
  'stream',
  'fieldOfStudy',
  'gender',
  'category',
] as const;
const LIST_FIELDS = ['parentOccupation', 'examsQualified'] as const;
// Test scores, each a number in its range (TEST_SCORE_RANGES).
const TEST_SCORE_FIELDS: readonly TestScoreField[] = ['atar', 'sat'];

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
  for (const field of TEST_SCORE_FIELDS) {
    const [min, max] = TEST_SCORE_RANGES[field];
    if (field in raw) keep(field, numberBetween(raw, field, min, max, reasons));
  }

  reasons.push(...contradictions(raw), ...boardMarksContradictions(raw));
  reasons.push(...residenceContradictions(raw), ...incomeContradictions(raw));
  reasons.push(
    ...testScoreContradictions(raw),
    ...indianOnlyContradictions(raw),
  );
  if (reasons.length > 0) return { ok: false, reasons };
  return { ok: true, profile: profile as Profile };
}

// Answers the rest of the Profile rules out, as the form clears them:
// single girl child only for a female Student, a stream only from Class 11.
function contradictions(raw: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  if ('singleGirlChild' in raw && raw.gender !== 'female') {
    reasons.push('singleGirlChild is only asked when gender is female');
  }
  if ('stream' in raw && (raw.class === 9 || raw.class === 10)) {
    reasons.push('stream is only asked from Class 11');
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
    if (isInRange(points, [min, max]) && Number.isInteger(points))
      return { scale, value: points };
    reasons.push(`${label} must be a whole number from ${min} to ${max}`);
    return undefined;
  }
  const [min, max] = RESULT_SCALE_RANGES[scale];
  const value = numberBetween(answer, 'value', min, max, reasons, label);
  return value === undefined ? undefined : { scale, value };
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

// Test scores, as the form asks them: the ATAR only of a Student living in
// Australia, the SAT score only on the US high-school board or of a Student
// heading to the US (frontend copy: unaskedTestScores in
// frontend/src/app/profile-rules.ts).
function testScoreContradictions(raw: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  if ('atar' in raw && raw.countryOfResidence !== 'AU') {
    reasons.push('atar is only asked when countryOfResidence is AU');
  }
  if (
    'sat' in raw &&
    raw.board !== 'us_high_school' &&
    raw.destination !== 'US'
  ) {
    reasons.push(
      'sat is only asked for the us_high_school board or when destination is US',
    );
  }
  return reasons;
}

// The Indian boards, whose Class 11 and 12 streams the stream question asks
// about (frontend copy: INDIAN_BOARDS in frontend/src/app/profile-rules.ts).
const INDIAN_BOARDS: readonly unknown[] = ['cbse', 'cisce', 'state'];

// Questions whose answers are Indian terms, as the form asks them, each also
// when its deciding answer is not given: the stream only on an Indian board,
// school type and the NMMS exam only of a Student living in India, parents'
// occupation only of an Indian citizen or OCI card holder (frontend copy:
// unaskedIndianOnly and offeredExams in frontend/src/app/profile-rules.ts).
function indianOnlyContradictions(raw: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  const country = raw.countryOfResidence;
  const abroad = country !== undefined && country !== INDIA;
  if (
    'stream' in raw &&
    raw.board !== undefined &&
    !INDIAN_BOARDS.includes(raw.board)
  ) {
    reasons.push('stream is only asked for the cbse, cisce or state board');
  }
  if ('schoolType' in raw && abroad) {
    reasons.push(
      'schoolType is only asked when countryOfResidence is IN or not given',
    );
  }
  if ('parentOccupation' in raw && raw.citizenship === 'other') {
    reasons.push(
      'parentOccupation is only asked when citizenship is indian or oci',
    );
  }
  const exams = raw.examsQualified;
  if (Array.isArray(exams) && exams.includes('nmms') && abroad) {
    reasons.push(
      'examsQualified nmms is only asked when countryOfResidence is IN or not given',
    );
  }
  return reasons;
}

// The fields that hold an answer: absent and null both mean not given.
function given(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== null),
  );
}
