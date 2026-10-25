import type {
  ConfidenceLevel,
  Criterion,
  ExtraRequirement,
} from '../scholarships/scholarship.schema.js';
import {
  type BoardMarksField,
  isBoardMarksField,
} from '../scholarships/criterion-fields.js';
import { INDIA } from './countries.js';
import { RUPEES } from './currencies.js';
import {
  A_LEVEL_GRADES,
  type ALevelGrade,
  type BoardResult,
  type IncomeAmount,
  type IncomeLimit,
  type IndianState,
  isALevelGrades,
  type Profile,
  RESULT_SCALE_RANGES,
  type ResultScale,
  STATE_REGIONS,
} from './profile.js';

// The slice of a Scholarship the Matcher needs. Only active Scholarships
// not needing review are matched; the others are skipped.
export interface MatchableScholarship {
  id: string;
  name: string;
  provider: string;
  amountText: string;
  officialUrl: string;
  deadline?: string;
  lastVerified: Date;
  confidence: ConfidenceLevel;
  criteria: Criterion[];
  // Shown on the card, never matched.
  extraRequirements?: ExtraRequirement[];
  status?: 'active' | 'inactive';
  needsReview?: boolean;
}

export type DeadlineStatus =
  'open' | 'closing_soon' | 'closed' | 'not_announced';

// Mirrored in frontend/src/app/api.ts.
export interface Card {
  id: string;
  name: string;
  provider: string;
  amountText: string;
  officialUrl: string;
  deadline?: string;
  deadlineStatus: DeadlineStatus;
  lastVerified: string;
  // Medium cards carry a "verify on the official site" warning.
  confidence: ConfidenceLevel;
  // Conditions no Profile field answers, each with its source sentence;
  // shown as "Also requires: …".
  extraRequirements: ExtraRequirement[];
  // What would turn a Within reach card Eligible; empty in other buckets.
  goals: string[];
  // Profile fields left empty that this scholarship checks.
  missing: MissingField[];
}

export interface MissingField {
  field: string;
  label: string;
}

export interface MatchResult {
  prompts: unknown[];
  eligible: Card[];
  withinReach: Card[];
  tellUsMore: Card[];
  universityPointers: unknown[];
}

type Outcome = 'pass' | 'fail' | 'unknown';

// How each Profile field is named to a Student.
const FIELD_LABELS: Record<string, string> = {
  class: 'class',
  countryOfResidence: 'the country you live in',
  region: 'the state or region you live in',
  homeState: 'home state',
  residenceStatus: 'residence status',
  citizenshipCountry: 'country of citizenship',
  schoolType: 'school type',
  citizenship: 'citizenship',
  board: 'board',
  class10Result: 'Class 10 result',
  class12Result: 'Class 12 result',
  boardsUpcoming: 'whether your boards are upcoming',
  atar: 'ATAR',
  sat: 'SAT score',
  stream: 'stream',
  fieldOfStudy: 'intended field of study',
  destination: 'study destination',
  destinationIsResidence: 'the country you live in and where you want to study',
  incomeBand: 'family income',
  incomeAmount: 'family income',
  gender: 'gender',
  category: 'category',
  minority: 'minority status',
  disability: 'disability',
  singleGirlChild: 'single girl child',
  parentOccupation: "parents' occupation",
  examsQualified: 'exams qualified',
};

// How each Result scale is named to a Student, after the result: "Class 12
// result in IB points".
const SCALE_LABELS: Record<ResultScale, string> = {
  percentage: 'percentage',
  cgpa_10: 'CGPA out of 10',
  gpa_4: 'GPA out of 4',
  ib_points: 'IB points',
  a_level: 'A-level grades',
};

type Bucket = 'eligible' | 'withinReach' | 'tellUsMore';

interface Placed {
  bucket: Bucket;
  card: Card;
  nextClass: boolean;
}

// Checks a Profile against every visible Scholarship on the given day
// (an ISO date, YYYY-MM-DD, in India).
export function match(
  profile: Profile,
  scholarships: MatchableScholarship[],
  today: string,
): MatchResult {
  const placed = scholarships
    .filter((s) => s.status !== 'inactive' && s.needsReview !== true)
    .map((s) => place(profile, s, today))
    .filter((p): p is Placed => p !== undefined)
    .sort(bySortOrder);
  const cardsIn = (bucket: Bucket) =>
    placed.filter((p) => p.bucket === bucket).map((p) => p.card);
  return {
    prompts: [],
    eligible: cardsIn('eligible'),
    withinReach: cardsIn('withinReach'),
    tellUsMore: cardsIn('tellUsMore'),
    universityPointers: [],
  };
}

// Decides one Scholarship's bucket, or undefined when it is hidden.
function place(
  profile: Profile,
  s: MatchableScholarship,
  today: string,
): Placed | undefined {
  const judged = criterionGroups(s.criteria).map((group) =>
    judgeGroup(group, profile),
  );
  const fails = judged.filter((j) => j.outcome === 'fail');
  const unknown = judged.flatMap((j) => j.unknown);
  const missing = missingFields(unknown, profile);
  const status = deadlineStatus(s.deadline, today);

  if (fails.length === 0) {
    if (status === 'closed') return undefined;
    return {
      bucket: unknown.length ? 'tellUsMore' : 'eligible',
      card: toCard(s, status, missing, []),
      nextClass: false,
    };
  }
  if (fails.length > MAX_GOALS) return undefined;
  // A failing Alternatives group takes the Goal of the first member that
  // has one.
  const goals = fails.map((j) =>
    j.failing.map((c) => goalFor(c, profile)).find((g) => g !== undefined),
  );
  if (!goals.every((g): g is string => g !== undefined)) return undefined;
  // A next-class card stays visible after the deadline: the scheme recurs.
  const nextClass = goals.includes(NEXT_CLASS_GOAL);
  if (status === 'closed' && !nextClass) return undefined;
  return {
    bucket: 'withinReach',
    card: toCard(s, status, missing, goals),
    nextClass,
  };
}

// A Scholarship's Criteria as they are judged, in order: each Criterion that
// stands alone as a group of one, and each Alternatives group with all its
// members.
function criterionGroups(criteria: Criterion[]): Criterion[][] {
  const groups = new Map<string, Criterion[]>();
  const result: Criterion[][] = [];
  for (const criterion of criteria) {
    const key = criterion.alternativeGroup;
    if (!key) {
      result.push([criterion]);
      continue;
    }
    const group = groups.get(key);
    if (group) {
      group.push(criterion);
    } else {
      const members = [criterion];
      groups.set(key, members);
      result.push(members);
    }
  }
  return result;
}

interface Judged {
  outcome: Outcome;
  // The members that left an unknown outcome undecided, and those that
  // failed.
  unknown: Criterion[];
  failing: Criterion[];
}

// An Alternatives group passes when any member passes, fails when every
// member fails, and is otherwise unknown (a Criterion standing alone is a
// group of one).
function judgeGroup(group: Criterion[], profile: Profile): Judged {
  const outcomes = group.map((c) => ({ c, o: evaluate(c, profile) }));
  const membersWith = (o: Outcome) =>
    outcomes.filter((x) => x.o === o).map((x) => x.c);
  const unknown = membersWith('unknown');
  const failing = membersWith('fail');
  if (membersWith('pass').length)
    return { outcome: 'pass', unknown: [], failing };
  if (unknown.length) return { outcome: 'unknown', unknown, failing };
  return { outcome: 'fail', unknown: [], failing };
}

// The answers that would settle the unknown Criteria, each named once. A
// Board marks Criterion on another scale than the Student's result names the
// scale it needs, and an income limit in another currency than the Student's
// income names the currency it needs ("family income in USD").
function missingFields(unknown: Criterion[], profile: Profile): MissingField[] {
  const missing = new Map<string, MissingField>();
  for (const criterion of unknown) {
    const { field } = criterion;
    const label = FIELD_LABELS[field] ?? field;
    const needs =
      neededScale(criterion, profile) ?? neededCurrency(criterion, profile);
    const named = needs ? `${label} in ${needs}` : label;
    missing.set(named, { field, label: named });
  }
  return [...missing.values()];
}

// The Result scale a Board marks Criterion needs, when the Student's result
// is on another.
function neededScale(
  criterion: Criterion,
  profile: Profile,
): string | undefined {
  const { field } = criterion;
  if (!isBoardMarksField(field)) return undefined;
  const target = asBoardResult(criterion.value);
  const answer = profile[field];
  return target && answer && target.scale !== answer.scale
    ? SCALE_LABELS[target.scale]
    : undefined;
}

// The currency an income limit is in, when the Student's income is in
// another: a rupee limit (incomeBand) is in INR.
function neededCurrency(
  criterion: Criterion,
  profile: Profile,
): string | undefined {
  const income = profile.incomeAmount;
  if (income === undefined) return undefined;
  const currency =
    criterion.field === 'incomeBand'
      ? RUPEES
      : criterion.field === 'incomeAmount'
        ? asIncomeAmount(criterion.value)?.currency
        : undefined;
  return currency !== undefined && currency !== income.currency
    ? currency
    : undefined;
}

const CLOSING_SOON_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function deadlineStatus(
  deadline: string | undefined,
  today: string,
): DeadlineStatus {
  if (!deadline) return 'not_announced';
  const days = (Date.parse(deadline) - Date.parse(today)) / DAY_MS;
  if (days < 0) return 'closed';
  return days <= CLOSING_SOON_DAYS ? 'closing_soon' : 'open';
}

// Next-class cards after the rest; then deadline soonest first, not
// announced last.
function bySortOrder(a: Placed, b: Placed): number {
  if (a.nextClass !== b.nextClass) return a.nextClass ? 1 : -1;
  const da = a.card.deadline;
  const db = b.card.deadline;
  if (da === db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da < db ? -1 : 1;
}

// More Goals than this and a scholarship is no longer honestly within reach.
const MAX_GOALS = 2;
// A marks Goal is offered only while boards are upcoming, and only for a
// rise of at most this many percentage points.
const MAX_MARKS_GOAL_RISE = 5;
// The same on IB points; never on A-level grades, a CGPA or a GPA.
const MAX_IB_POINTS_GOAL_RISE = 2;
// The class value a Criterion uses to require undergraduate admission.
const UG = 'ug';
const NEXT_CLASS_GOAL = 'Eligible from next year: watch for the next round';
const UG_GOAL = 'Get admitted to an undergraduate course to unlock this';

// The change that would turn a failing Criterion into a pass, phrased for the
// Student, or undefined when the fail can't be changed within its limit.
function goalFor(criterion: Criterion, profile: Profile): string | undefined {
  if (!criterion.changeable) return undefined;
  const { field } = criterion;
  if (isBoardMarksField(field)) return boardMarksGoal(criterion, profile);
  if (field === 'class' && profile.class !== undefined) {
    // Up one year only; Class 12 never moves up to UG, but a Class 12
    // Student can still get admitted to UG.
    if (profile.class < 12 && compare(criterion, profile.class + 1) === 'pass')
      return NEXT_CLASS_GOAL;
    if (profile.class === 12 && compare(criterion, UG) === 'pass')
      return UG_GOAL;
  }
  return undefined;
}

// Today's marks rule on Board marks: a rise of at most 5 percentage points,
// or of at most 2 IB points, is a Goal while the boards for that result are
// still upcoming. Only a Class 12 result can be: a Class 12 Student's
// upcoming boards are Class 12's (their Class 10 result is final), and a
// Class 10 Student with boards upcoming gives no Class 10 result (the Board
// marks grid).
function boardMarksGoal(
  criterion: Criterion,
  profile: Profile,
): string | undefined {
  const field = criterion.field as BoardMarksField;
  const target = asBoardResult(criterion.value);
  const answer = profile[field];
  if (field !== 'class12Result' || criterion.op !== 'gte') return undefined;
  if (!target || !answer) return undefined;
  if (profile.boardsUpcoming !== true || profile.class !== 12) return undefined;
  if (target.scale === 'percentage' && answer.scale === 'percentage') {
    const [, max] = RESULT_SCALE_RANGES.percentage;
    const rise = target.value - answer.value;
    if (target.value > max || rise > MAX_MARKS_GOAL_RISE) return undefined;
    return `Score ${target.value}% in Class 12 to unlock this`;
  }
  if (target.scale === 'ib_points' && answer.scale === 'ib_points') {
    const [, max] = RESULT_SCALE_RANGES.ib_points;
    const rise = target.value - answer.value;
    if (target.value > max || rise > MAX_IB_POINTS_GOAL_RISE) return undefined;
    return `Score ${target.value} IB points to unlock this`;
  }
  return undefined;
}

// A Board marks result, or undefined when the value isn't one.
function asBoardResult(value: unknown): BoardResult | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { scale, value: result } = value as Record<string, unknown>;
  if (scale === 'a_level') {
    return isALevelGrades(result) ? { scale, value: result } : undefined;
  }
  return typeof scale === 'string' && typeof result === 'number'
    ? { scale: scale as Exclude<ResultScale, 'a_level'>, value: result }
    : undefined;
}

// A result passes a threshold on its own scale; on another scale it can't be
// judged, since results are never converted.
function compareBoardResult(threshold: unknown, answer: unknown): Outcome {
  const target = asBoardResult(threshold);
  const result = asBoardResult(answer);
  if (!target || !result || target.scale !== result.scale) return 'unknown';
  if (target.scale === 'a_level' && result.scale === 'a_level')
    return meetsGrades(result.value, target.value) ? 'pass' : 'fail';
  if (target.scale === 'a_level' || result.scale === 'a_level')
    return 'unknown';
  return result.value >= target.value ? 'pass' : 'fail';
}

// A-level grades meet those asked when, both taken best first, the Student
// has as many grades and each is at least the one asked ("A*AB" meets
// "AAB", not "AAA").
function meetsGrades(grades: ALevelGrade[], asked: ALevelGrade[]): boolean {
  const rank = (grade: ALevelGrade) => A_LEVEL_GRADES.indexOf(grade);
  const bestFirst = (list: ALevelGrade[]) =>
    list.map(rank).sort((a, b) => a - b);
  const have = bestFirst(grades);
  return bestFirst(asked).every(
    (need, i) => i < have.length && have[i] <= need,
  );
}

// Income bands in rupees. A Student's income lies somewhere inside their
// band; a threshold on a band edge still decides. The keys are also the
// bands a Match request may send (profile-input.ts): they stay beside their
// ranges rather than in FIXED_LISTS, which holds the values Criteria are
// written in, and an income Criterion holds rupees, not a band.
export const INCOME_BANDS: Record<string, [number, number]> = {
  under_1l: [0, 100_000],
  '1l_2l': [100_000, 200_000],
  '2l_2_5l': [200_000, 250_000],
  '2_5l_3l': [250_000, 300_000],
  '3l_4_5l': [300_000, 450_000],
  '4_5l_6l': [450_000, 600_000],
  '6l_8l': [600_000, 800_000],
  over_8l: [800_000, Infinity],
};

// Answers that follow from others: the Home state of a Student in India is
// the region they live in; an Indian citizen is a citizen of India. An OCI card holder's country of
// citizenship is not known. A Student studies at home when their
// destination is the country they live in, which needs both answers.
function derivedAnswer(profile: Profile, field: string): unknown {
  if (field === 'destinationIsResidence') {
    const { destination, countryOfResidence } = profile;
    if (destination === undefined || countryOfResidence === undefined)
      return undefined;
    return destination === countryOfResidence;
  }
  if (field === 'homeState')
    return profile.homeState ?? homeStateInIndia(profile);
  // A Student abroad may give their income in rupees, which a rupee limit
  // can judge.
  if (field === 'incomeBand') return profile.incomeBand ?? profile.incomeAmount;
  if (field === 'citizenshipCountry') {
    return (
      profile.citizenshipCountry ??
      (profile.citizenship === 'indian' ? INDIA : undefined)
    );
  }
  return (profile as Record<string, unknown>)[field];
}

function homeStateInIndia(profile: Profile): IndianState | undefined {
  if (profile.countryOfResidence !== INDIA) return undefined;
  return (Object.keys(STATE_REGIONS) as IndianState[]).find(
    (state) => STATE_REGIONS[state] === profile.region,
  );
}

function answerFor(profile: Profile, field: string): unknown {
  const answer = derivedAnswer(profile, field);
  if (answer === null || answer === '') return undefined;
  if (Array.isArray(answer) && answer.length === 0) return undefined;
  return answer;
}

function evaluate(criterion: Criterion, profile: Profile): Outcome {
  const answer = answerFor(profile, criterion.field);
  if (answer === undefined) return 'unknown';
  return compare(criterion, answer);
}

function compare(criterion: Criterion, answer: unknown): Outcome {
  const { op, value } = criterion;
  if (isBoardMarksField(criterion.field) && op === 'gte') {
    return compareBoardResult(value, answer);
  }
  if (criterion.field === 'incomeAmount' && op === 'lte') {
    return compareIncomeAmount(value, answer);
  }
  if (criterion.field === 'incomeBand' && asIncomeAmount(answer)) {
    // A rupee limit is a yearly limit in INR.
    if (op !== 'lte') return 'unknown';
    const limit: IncomeLimit = {
      currency: RUPEES,
      period: 'yearly',
      value: Number(value),
    };
    return compareIncomeAmount(limit, answer);
  }
  if (criterion.field === 'incomeBand' && (op === 'lte' || op === 'gte')) {
    return compareIncome(op, Number(value), String(answer));
  }
  const answers = Array.isArray(answer) ? answer : [answer];
  const allowed = op === 'in' && Array.isArray(value) ? value : [value];
  const passes =
    op === 'eq' || op === 'in'
      ? answers.some((a) => allowed.includes(a))
      : answers.some((a) =>
          op === 'lte'
            ? Number(a) <= Number(value)
            : Number(a) >= Number(value),
        );
  return passes ? 'pass' : 'fail';
}

const MONTHS_IN_A_YEAR = 12;

// An income amount, or undefined when the value isn't one.
function asIncomeAmount(value: unknown): IncomeAmount | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { currency, value: amount } = value as Record<string, unknown>;
  return typeof currency === 'string' && typeof amount === 'number'
    ? { currency, value: amount }
    : undefined;
}

// An income limit, or undefined when the value isn't one; a limit stating no
// period is yearly, as income limits usually are.
function asIncomeLimit(value: unknown): IncomeLimit | undefined {
  const amount = asIncomeAmount(value);
  if (!amount) return undefined;
  const { period } = value as Record<string, unknown>;
  return { ...amount, period: period === 'monthly' ? 'monthly' : 'yearly' };
}

// A yearly income against a limit in the same currency, a monthly limit
// counted as twelve months. In another currency it can't be judged, since
// incomes are never converted.
function compareIncomeAmount(threshold: unknown, answer: unknown): Outcome {
  const limit = asIncomeLimit(threshold);
  const income = asIncomeAmount(answer);
  if (!limit || !income || limit.currency !== income.currency) return 'unknown';
  const yearly =
    limit.period === 'monthly' ? limit.value * MONTHS_IN_A_YEAR : limit.value;
  return income.value <= yearly ? 'pass' : 'fail';
}

function compareIncome(
  op: 'lte' | 'gte',
  threshold: number,
  band: string,
): Outcome {
  const range = INCOME_BANDS[band];
  if (!range || Number.isNaN(threshold)) return 'unknown';
  const [low, high] = range;
  if (op === 'lte') {
    if (high <= threshold) return 'pass';
    if (low >= threshold) return 'fail';
  } else {
    if (low >= threshold) return 'pass';
    if (high <= threshold) return 'fail';
  }
  return 'unknown';
}

// Extra requirements as a card carries them: their text and sentence only.
export function plainExtraRequirements(
  extraRequirements: ExtraRequirement[],
): ExtraRequirement[] {
  return extraRequirements.map(({ text, sourceText }) => ({
    text,
    sourceText,
  }));
}

function toCard(
  s: MatchableScholarship,
  deadlineStatus: DeadlineStatus,
  missing: MissingField[],
  goals: string[],
): Card {
  return {
    id: s.id,
    name: s.name,
    provider: s.provider,
    amountText: s.amountText,
    officialUrl: s.officialUrl,
    deadline: s.deadline,
    deadlineStatus,
    lastVerified: s.lastVerified.toISOString(),
    confidence: s.confidence,
    extraRequirements: plainExtraRequirements(s.extraRequirements ?? []),
    goals,
    missing,
  };
}
