import { approvedValue } from '../ingestion/extractor.js';
import {
  FIXED_LISTS,
  YES_NO_CRITERION_FIELDS,
} from '../ingestion/normalise.js';
import { CURRENCY_CODES, RUPEES } from '../match/currencies.js';
import { UG } from '../match/matcher.js';
import {
  CLASSES,
  INCOME_PERIODS,
  isALevelGrades,
  isInRange,
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
  | 'raw value outside the allowed options'
  | 'value outside the fixed list'
  | 'value outside the range'
  | 'unsupported Result scale'
  | 'unsupported currency'
  | 'unsupported income period';

// The classes a Criterion may name: the Student's own, and undergraduate
// admission, which a Class 12 Student can reach as a Goal.
const CRITERION_CLASSES: readonly unknown[] = [...CLASSES, UG];

// What is wrong with a stored Criterion, or undefined when a Profile could
// satisfy it. A low Criterion holds the LLM's raw values until a reviewer
// approves it, so its values are checked as approving would read them.
export function criterionProblem(
  criterion: Criterion,
): AuditProblem | undefined {
  const { field } = criterion;
  if (!isCriterionField(field)) return 'unknown field';
  const value = approvedValue(criterion);
  if (value === undefined) return 'raw value outside the allowed options';
  if (isBoardMarksField(field)) return boardResultProblem(field, value);
  if (field === 'incomeAmount') return incomeLimitProblem(value);
  if (field === 'incomeBand') return rangeProblem(isPositive(value));
  if (field === 'atar' || field === 'sat') {
    return rangeProblem(isInRange(value, TEST_SCORE_RANGES[field]));
  }
  if (field === 'class') return allIn(value, CRITERION_CLASSES);
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

function rangeProblem(inRange: boolean): AuditProblem | undefined {
  return inRange ? undefined : 'value outside the range';
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
  if (scale === 'a_level') return rangeProblem(isALevelGrades(result));
  const range = RESULT_SCALE_RANGES[scale as Exclude<ResultScale, 'a_level'>];
  return rangeProblem(isInRange(result, range));
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
  if (!(INCOME_PERIODS as readonly unknown[]).includes(period)) {
    return 'unsupported income period';
  }
  return rangeProblem(isPositive(amount));
}

function isPositive(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}
