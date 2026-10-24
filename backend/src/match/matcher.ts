import type {
  ConfidenceLevel,
  Criterion,
  ExtraRequirement,
} from '../scholarships/scholarship.schema.js';
import type { BoardResult, Profile } from './profile.js';

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
  domicileState: 'home state',
  schoolState: 'school state',
  schoolType: 'school type',
  citizenship: 'citizenship',
  board: 'board',
  class10Marks: 'Class 10 marks',
  latestMarks: 'latest marks',
  class10Result: 'Class 10 result',
  class12Result: 'Class 12 result',
  boardsUpcoming: 'whether your boards are upcoming',
  stream: 'stream',
  fieldOfStudy: 'intended field of study',
  destination: 'study destination',
  incomeBand: 'family income',
  gender: 'gender',
  category: 'category',
  minority: 'minority status',
  disability: 'disability',
  singleGirlChild: 'single girl child',
  parentOccupation: "parents' occupation",
  examsQualified: 'exams qualified',
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
  const outcomes = s.criteria.map((c) => ({ c, o: evaluate(c, profile) }));
  const fails = outcomes.filter((x) => x.o === 'fail').map((x) => x.c);
  const unknown = outcomes.filter((x) => x.o === 'unknown');
  const missing = [...new Set(unknown.map((x) => x.c.field))].map((field) => ({
    field,
    label: FIELD_LABELS[field] ?? field,
  }));
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
  const goals = fails.map((c) => goalFor(c, profile));
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
// A marks shortfall counts only while boards are upcoming, and only this big.
const MAX_MARKS_GAP = 5;
// The class value a Criterion uses to require undergraduate admission.
const UG = 'ug';
const NEXT_CLASS_GOAL = 'Eligible from next year: watch for the next round';
const UG_GOAL = 'Get admitted to an undergraduate course to unlock this';

// The change that would turn a failing Criterion into a pass, phrased for the
// Student, or undefined when the fail can't be changed within its limit.
function goalFor(criterion: Criterion, profile: Profile): string | undefined {
  if (!criterion.changeable) return undefined;
  const { field, op, value } = criterion;
  if (isBoardMarksField(field)) return boardMarksGoal(criterion, profile);
  if (
    (field === 'latestMarks' || field === 'class10Marks') &&
    op === 'gte' &&
    profile.boardsUpcoming === true
  ) {
    const target = Number(value);
    const gap = target - Number(profile[field]);
    if (target > 100 || gap > MAX_MARKS_GAP) return undefined;
    return field === 'class10Marks'
      ? `Score ${target}% in Class 10 to unlock this`
      : `Score ${target}% to unlock this`;
  }
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

const BOARD_MARKS_YEAR = { class10Result: 10, class12Result: 12 } as const;
type BoardMarksField = keyof typeof BOARD_MARKS_YEAR;

function isBoardMarksField(field: string): field is BoardMarksField {
  return field in BOARD_MARKS_YEAR;
}

// Today's marks rule on Board marks: a percentage shortfall of at most 5 is
// a Goal while the boards for that result are still upcoming (a Class 12
// Student's upcoming boards are Class 12's; their Class 10 result is final).
function boardMarksGoal(
  criterion: Criterion,
  profile: Profile,
): string | undefined {
  const field = criterion.field as BoardMarksField;
  const year = BOARD_MARKS_YEAR[field];
  const target = asBoardResult(criterion.value);
  const answer = profile[field];
  if (criterion.op !== 'gte' || !target || !answer) return undefined;
  if (profile.boardsUpcoming !== true || profile.class !== year)
    return undefined;
  if (target.scale !== 'percentage' || answer.scale !== 'percentage')
    return undefined;
  if (target.value > 100 || target.value - answer.value > MAX_MARKS_GAP)
    return undefined;
  return `Score ${target.value}% in Class ${year} to unlock this`;
}

// A Board marks result, or undefined when the value isn't one.
function asBoardResult(value: unknown): BoardResult | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { scale, value: number } = value as Record<string, unknown>;
  return typeof scale === 'string' && typeof number === 'number'
    ? { scale: scale as BoardResult['scale'], value: number }
    : undefined;
}

// A result passes a threshold on its own scale; on another scale it can't be
// judged, since results are never converted.
function compareBoardResult(threshold: unknown, answer: unknown): Outcome {
  const target = asBoardResult(threshold);
  const result = asBoardResult(answer);
  if (!target || !result || target.scale !== result.scale) return 'unknown';
  return result.value >= target.value ? 'pass' : 'fail';
}

// Income bands in rupees. A Student's income lies somewhere inside their
// band; a threshold on a band edge still decides.
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

function answerFor(profile: Profile, field: string): unknown {
  const answer = (profile as Record<string, unknown>)[field];
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
