import { FIXED_LISTS } from '../ingestion/normalise.js';
import {
  isObject,
  listOf,
  numberBetween,
  oneOf,
  yesNo,
} from '../input-checks.js';
import { INCOME_BANDS } from './matcher.js';
import type { BoardResult, Profile, ResultScale } from './profile.js';

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

  for (const field of BOARD_MARKS_FIELDS) {
    if (field in raw) keep(field, boardResult(raw, field, reasons));
  }

  reasons.push(...contradictions(raw), ...boardMarksContradictions(raw));
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

// Board marks: each result a value inside its Result scale's range.
const BOARD_MARKS_FIELDS = ['class10Result', 'class12Result'] as const;
const RESULT_SCALE_RANGES: Record<ResultScale, [min: number, max: number]> = {
  percentage: [0, 100],
};
const RESULT_SCALES = Object.keys(RESULT_SCALE_RANGES) as ResultScale[];

function boardResult(
  raw: Record<string, unknown>,
  field: string,
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
    RESULT_SCALES,
    reasons,
    `${field}.scale`,
  );
  if (scale === undefined) return undefined;
  const [min, max] = RESULT_SCALE_RANGES[scale];
  const value = numberBetween(
    answer,
    'value',
    min,
    max,
    reasons,
    `${field}.value`,
  );
  return value === undefined ? undefined : { scale, value };
}

// The Board marks grid, as the form applies it: a Class 10 result from
// Class 10 once its boards are done, a Class 12 result only in Class 12,
// and boards upcoming only in a class that ends in board exams. A Student
// who gives no class may give both results.
function boardMarksContradictions(raw: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  const boardsAhead = raw.class === 10 && raw.boardsUpcoming === true;
  if ('class10Result' in raw && (raw.class === 9 || boardsAhead)) {
    reasons.push(
      'class10Result is only asked from Class 10, once Class 10 boards are done',
    );
  }
  if ('class12Result' in raw && raw.class !== undefined && raw.class !== 12) {
    reasons.push('class12Result is only asked in Class 12');
  }
  if ('boardsUpcoming' in raw && raw.class !== 10 && raw.class !== 12) {
    reasons.push('boardsUpcoming is only asked in Class 10 or 12');
  }
  return reasons;
}

// The fields that hold an answer: absent and null both mean not given.
function given(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== null),
  );
}
