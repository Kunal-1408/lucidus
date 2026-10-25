import {
  FIXED_LISTS,
  YES_NO_CRITERION_FIELDS,
} from '../ingestion/normalise.js';
import { CURRENCY_CODES, RUPEES } from '../match/currencies.js';
import {
  isALevelGrades,
  RESULT_SCALE_RANGES,
  type ResultScale,
  SLOT_SCALES,
  TEST_SCORE_RANGES,
} from '../match/profile.js';
import {
  type BoardMarksField,
  isBoardMarksField,
  isCriterionField,
} from './criterion-fields.js';
import type { Criterion } from './scholarship.schema.js';

// Why no valid Profile could ever satisfy a stored Criterion.
export type AuditProblem =
  | 'unknown field'
  | 'value outside the fixed list'
  | 'value outside the range'
  | 'unsupported Result scale'
  | 'unsupported currency'
  | 'unsupported income period';

// The classes a Criterion may name: Class 9 to 12, and undergraduate
// admission, which a Class 12 Student can reach as a Goal.
const CLASSES: readonly unknown[] = [9, 10, 11, 12, 'ug'];
const INCOME_PERIODS: readonly unknown[] = ['monthly', 'yearly'];

// What is wrong with a stored Criterion, or undefined when a Profile could
// satisfy it. A low Criterion holds the LLM's raw values until a reviewer
// approves it (and is in the Review report already), so only its field is
// checked.
export function criterionProblem(
  criterion: Criterion,
): AuditProblem | undefined {
  const { field, value } = criterion;
  if (!isCriterionField(field)) return 'unknown field';
  if (criterion.confidence === 'low') return undefined;
  if (isBoardMarksField(field)) return boardResultProblem(field, value);
  if (field === 'incomeAmount') return incomeLimitProblem(value);
  if (field === 'incomeBand') {
    return isPositive(value) ? undefined : 'value outside the range';
  }
  if (field === 'atar' || field === 'sat') {
    const [min, max] = TEST_SCORE_RANGES[field];
    const inRange = typeof value === 'number' && value >= min && value <= max;
    return inRange ? undefined : 'value outside the range';
  }
  if (field === 'class') return allIn(value, CLASSES);
  if (YES_NO_CRITERION_FIELDS.includes(field)) {
    return typeof value === 'boolean'
      ? undefined
      : 'value outside the fixed list';
  }
  return allIn(value, FIXED_LISTS[field] ?? []);
}

function allIn(
  value: unknown,
  allowed: readonly unknown[],
): AuditProblem | undefined {
  const values = Array.isArray(value) ? value : [value];
  const ok = values.length > 0 && values.every((v) => allowed.includes(v));
  return ok ? undefined : 'value outside the fixed list';
}

// A Board marks threshold on a Result scale its slot takes, inside that
// scale.
function boardResultProblem(
  field: BoardMarksField,
  value: unknown,
): AuditProblem | undefined {
  const { scale, value: result } = asRecord(value);
  if (!SLOT_SCALES[field].includes(scale as ResultScale)) {
    return 'unsupported Result scale';
  }
  if (scale === 'a_level') {
    return isALevelGrades(result) ? undefined : 'value outside the range';
  }
  const [min, max] =
    RESULT_SCALE_RANGES[scale as Exclude<ResultScale, 'a_level'>];
  const inRange = typeof result === 'number' && result >= min && result <= max;
  return inRange ? undefined : 'value outside the range';
}

// An income limit in a currency other than rupees (a rupee limit is an
// incomeBand), counted monthly or yearly.
function incomeLimitProblem(value: unknown): AuditProblem | undefined {
  const { currency, period, value: amount } = asRecord(value);
  if (
    typeof currency !== 'string' ||
    currency === RUPEES ||
    !CURRENCY_CODES.includes(currency)
  ) {
    return 'unsupported currency';
  }
  if (!INCOME_PERIODS.includes(period)) return 'unsupported income period';
  return isPositive(amount) ? undefined : 'value outside the range';
}

function isPositive(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}
