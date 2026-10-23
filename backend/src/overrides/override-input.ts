import { LLM_FIELDS } from '../ingestion/extractor.js';
import { isObject, oneOf, text } from '../input-checks.js';
import type { Override, ReplacementCriterion } from './override.schema.js';

// An Override as the reviewer sends it: everything but what the code sets
// (reviewed at) and what only Ingestion writes (last result, problems).
export type OverrideInput = Omit<
  Override,
  'reviewedAt' | 'lastResult' | 'problems'
>;

export type ParseResult =
  { ok: true; override: OverrideInput } | { ok: false; reasons: string[] };

const ACTIONS = ['approve', 'replace'] as const;
const FIELDS = Object.keys(LLM_FIELDS);

// Checks an Override's shape, collecting every reason it is rejected.
// Whether replacement Criteria quote the current page and use allowed values
// is checked by Ingestion against the section's text; an Override failing
// that is skipped and listed in the Review report. Unknown fields are
// dropped.
export function parseOverride(body: unknown): ParseResult {
  const raw = isObject(body) ? body : {};
  const reasons: string[] = [];

  const sourceUrl = text(raw, 'sourceUrl', reasons);
  const schemeName = text(raw, 'schemeName', reasons);
  const contentHash = hash(raw.contentHash, reasons);
  const action = oneOf(raw, 'action', ACTIONS, reasons);
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
  action: 'approve' | 'replace' | undefined,
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
    const sourceText = text(raw, 'sourceText', reasons, `${label}.sourceText`);
    return { field: field!, values: values!, sourceText: sourceText! };
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
