import type { ConfidenceLevel, Criterion } from './scholarship.schema.js';

const RANK: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };

// The Criterion a Scholarship's Confidence comes from: the first of the
// lowest Confidence, or none when there are no Criteria.
export function weakestCriterion(criteria: Criterion[]): Criterion | undefined {
  return criteria.reduce<Criterion | undefined>(
    (lowest, criterion) =>
      !lowest || RANK[criterion.confidence] < RANK[lowest.confidence]
        ? criterion
        : lowest,
    undefined,
  );
}

// A Scholarship's Confidence is its weakest Criterion's, and low when its
// official URL is missing (it comes from the Watchlist entry, so this should
// not happen). With no Criteria it is high, and needs review is set for that
// reason instead.
export function scholarshipConfidence(
  criteria: Criterion[],
  officialUrl: string | undefined,
): ConfidenceLevel {
  if (!officialUrl) return 'low';
  return weakestCriterion(criteria)?.confidence ?? 'high';
}
