import { approvedValue, checkQuoted } from '../ingestion/extractor.js';
import type { Criterion } from '../scholarships/scholarship.schema.js';
import type { Override } from './override.schema.js';

// A person's check of a Scholarship that an Override applies: who and when,
// and the Criteria it goes live with, all high Confidence.
export interface Review {
  reviewedBy: string;
  reviewedAt: Date;
  criteria: Criterion[];
}

export type OverrideCheck =
  | { result: 'applied'; review: Review }
  | { result: 'invalid'; problems: string[] }
  | { result: 'page changed' };

// What an Override does to a section with this text and hash, given the
// Criteria extracted from it (what the reviewer saw in the Review report).
// It holds only for the text it was written against. An approve makes the
// extracted Criteria high, so each must hold allowed values; replacement
// Criteria meet the same quote check as the LLM's.
export function checkOverride(
  override: Override,
  contentHash: string,
  text: string,
  extracted: Criterion[],
): OverrideCheck {
  if (override.contentHash !== contentHash) return { result: 'page changed' };
  const criteria: Criterion[] = [];
  const problems: string[] = [];
  if (override.action === 'approve') {
    for (const criterion of extracted) {
      const { field, op, changeable, sourceText } = criterion;
      const value = approvedValue(criterion);
      if (value === undefined) {
        problems.push(`${field}: values outside the allowed options`);
      } else {
        criteria.push({
          field,
          op,
          value,
          changeable,
          sourceText,
          confidence: 'high',
        });
      }
    }
  } else {
    for (const { field, values, sourceText } of override.criteria ?? []) {
      const checked = checkQuoted({ field, values, quote: sourceText }, text);
      if (checked.ok) {
        criteria.push({ ...checked.criterion, confidence: 'high' });
      } else {
        problems.push(checked.problem);
      }
    }
  }
  if (problems.length > 0) return { result: 'invalid', problems };
  const { reviewedBy, reviewedAt } = override;
  return { result: 'applied', review: { reviewedBy, reviewedAt, criteria } };
}
