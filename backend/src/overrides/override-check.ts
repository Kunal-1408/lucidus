import { checkQuoted } from '../ingestion/extractor.js';
import type { Criterion } from '../scholarships/scholarship.schema.js';
import type { Override } from './override.schema.js';

// A person's check of a Scholarship that an Override applies: who and when,
// and the Criteria it goes live with.
export interface Review {
  reviewedBy: string;
  reviewedAt: Date;
  // Replacement Criteria, already checked; absent when approving.
  criteria?: Criterion[];
}

export type OverrideCheck =
  | { result: 'applied'; review: Review }
  | { result: 'invalid'; problems: string[] }
  | { result: 'page changed' };

// What an Override does to a section with this text and hash. It holds only
// for the text it was written against; replacement Criteria meet the same
// quote check as the LLM's.
export function checkOverride(
  override: Override,
  contentHash: string,
  text: string,
): OverrideCheck {
  if (override.contentHash !== contentHash) return { result: 'page changed' };
  const { reviewedBy, reviewedAt } = override;
  if (override.action === 'approve') {
    return { result: 'applied', review: { reviewedBy, reviewedAt } };
  }
  const criteria: Criterion[] = [];
  const problems: string[] = [];
  for (const { field, values, sourceText } of override.criteria ?? []) {
    const checked = checkQuoted({ field, values, quote: sourceText }, text);
    if (checked.ok) criteria.push({ ...checked.criterion, confidence: 'high' });
    else problems.push(checked.problem);
  }
  if (problems.length > 0) return { result: 'invalid', problems };
  return { result: 'applied', review: { reviewedBy, reviewedAt, criteria } };
}

// The Criteria a reviewed Scholarship goes live with: the replacements, or
// the extracted ones as approved. Either way a person checked them, so they
// are high Confidence.
export function reviewedCriteria(
  extracted: Criterion[],
  review: Review,
): Criterion[] {
  return (
    review.criteria ??
    extracted.map(({ field, op, value, changeable, sourceText }) => ({
      field,
      op,
      value,
      changeable,
      sourceText,
      confidence: 'high',
    }))
  );
}
