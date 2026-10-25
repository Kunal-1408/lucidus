import { readValue } from '../ingestion/extractor.js';
import { isObject, oneOf, text } from '../input-checks.js';
import { CRITERION_FIELDS } from '../scholarships/criterion-fields.js';
import { memberOf } from '../scholarships/scholarship.schema.js';
import {
  OVERRIDE_ACTIONS,
  type Override,
  type OverrideAction,
  type ReplacementCriterion,
} from './override.schema.js';

// An Override as the reviewer sends it: everything but what the code sets
// (reviewed at) and what only Ingestion writes (last result, problems).
export type OverrideInput = Omit<
  Override,
  'reviewedAt' | 'lastResult' | 'problems'
>;

export type ParseResult<T = OverrideInput> =
  { ok: true; override: T } | { ok: false; reasons: string[] };

const FIELDS = Object.keys(CRITERION_FIELDS);

// Checks an Override's shape, collecting every reason it is rejected;
// replacement values must be allowed options. Whether replacement Criteria
// quote the page is checked by Ingestion against the section's text; an
// Override failing that is skipped and listed in the Review report. Unknown
// fields are dropped.
export function parseOverride(body: unknown): ParseResult {
  const raw = isObject(body) ? body : {};
  const reasons: string[] = [];

  const sourceUrl = text(raw, 'sourceUrl', reasons);
  const schemeName = text(raw, 'schemeName', reasons);
  const contentHash = hash(raw.contentHash, reasons);
  const action = oneOf(raw, 'action', OVERRIDE_ACTIONS, reasons);
  const note = text(raw, 'note', reasons);
  const reviewedBy = text(raw, 'reviewedBy', reasons);
  const criteria = replacementCriteria(raw.criteria, action, reasons);

  if (reasons.length > 0) return { ok: false, reasons };
  return {
    ok: true,
    override: {
      sourceUrl: sourceUrl!,
      schemeName: schemeName!,
      contentHash: contentHash!,
      action: action!,
      ...(criteria && { criteria }),
      note: note!,
      reviewedBy: reviewedBy!,
    },
  };
}

// An Override as the repo's overrides file holds it: as sent to the
// endpoint, plus when it was reviewed (an ISO date-time), so a fresh deploy
// keeps who reviewed it and when.
export function parseFiledOverride(body: unknown): ParseResult<Override> {
  const parsed = parseOverride(body);
  const reasons = parsed.ok ? [] : [...parsed.reasons];
  const raw = isObject(body) ? body : {};
  const reviewedAt = dateTime(raw.reviewedAt, 'reviewedAt', reasons);
  if (!parsed.ok || reasons.length > 0) return { ok: false, reasons };
  return {
    ok: true,
    override: { ...parsed.override, reviewedAt: reviewedAt! },
  };
}

function dateTime(
  value: unknown,
  label: string,
  reasons: string[],
): Date | undefined {
  const date = typeof value === 'string' ? new Date(value) : undefined;
  if (date && !Number.isNaN(date.getTime())) return date;
  reasons.push(
    value === undefined
      ? `${label} is required`
      : `${label} must be an ISO date-time`,
  );
  return undefined;
}

function hash(value: unknown, reasons: string[]): string | undefined {
  if (typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)) return value;
  reasons.push(
    value === undefined
      ? 'contentHash is required'
      : 'contentHash must be a SHA-256 hex digest',
  );
  return undefined;
}

function replacementCriteria(
  value: unknown,
  action: OverrideAction | undefined,
  reasons: string[],
): ReplacementCriterion[] | undefined {
  if (action !== 'replace') {
    if (value !== undefined && action === 'approve') {
      reasons.push('criteria is only allowed when action is replace');
    }
    return undefined;
  }
  if (!Array.isArray(value) || value.length === 0) {
    reasons.push('criteria is required when action is replace');
    return undefined;
  }
  return value.map((item, i) => {
    const label = `criteria[${i}]`;
    const raw = isObject(item) ? item : {};
    const field = oneOf(raw, 'field', FIELDS, reasons, `${label}.field`);
    const values = rawValues(raw.values, `${label}.values`, reasons);
    if (field && values && readValue(field, values) === undefined) {
      reasons.push(`${label}.values must be allowed options for ${field}`);
    }
    const sourceText = text(raw, 'sourceText', reasons, `${label}.sourceText`);
    const alternativeGroup =
      raw.alternativeGroup === undefined
        ? undefined
        : text(raw, 'alternativeGroup', reasons, `${label}.alternativeGroup`);
    return {
      field: field!,
      values: values!,
      sourceText: sourceText!,
      ...memberOf(alternativeGroup),
    };
  });
}

// Numbers are accepted as written ("60", "250000"), as the LLM gives them.
function rawValues(
  value: unknown,
  label: string,
  reasons: string[],
): string[] | undefined {
  const ok =
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (v) =>
        (typeof v === 'string' && v.trim() !== '') || typeof v === 'number',
    );
  if (!ok) {
    reasons.push(`${label} must be a non-empty list of strings or numbers`);
    return undefined;
  }
  return value.map((v) => String(v).trim());
}
