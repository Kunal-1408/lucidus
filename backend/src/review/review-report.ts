import type { Types } from 'mongoose';
import { weakestCriterion } from '../scholarships/confidence.js';
import type {
  Criterion,
  Scholarship,
} from '../scholarships/scholarship.schema.js';

// Every entry names the Scholarship it is about and its current content
// hash, which is what an Override is written against.
interface ReviewEntryBase {
  id: string;
  name: string;
  sourceUrl: string;
  schemeName: string;
  officialUrl: string;
  contentHash: string;
}

// Its weakest Criterion is low; shown with the sentence it came from.
export interface LowConfidenceEntry extends ReviewEntryBase {
  reason: 'low confidence';
  criterion: Criterion;
}

// Extracted with zero Criteria, so it would show as Eligible to everyone.
export interface NoCriteriaEntry extends ReviewEntryBase {
  reason: 'no criteria';
}

// One line of the Review report. Each reason is its own shape; a new reason
// joins this union and gets its own builder.
export type ReviewEntry = LowConfidenceEntry | NoCriteriaEntry;

export type StoredScholarship = Scholarship & { _id: Types.ObjectId };

// The filter for Scholarships the Review report lists: listed, but hidden
// from Students until a person checks them.
export const NEEDING_REVIEW = { status: 'active', needsReview: true } as const;

// Why a Scholarship needs review. Zero Criteria are stored high Confidence
// with needs review set, so they are told apart by the empty list;
// otherwise the weakest Criterion is the first low one.
export function scholarshipEntry(scholarship: StoredScholarship): ReviewEntry {
  const base: ReviewEntryBase = {
    id: scholarship._id.toHexString(),
    name: scholarship.name,
    sourceUrl: scholarship.sourceUrl,
    schemeName: scholarship.schemeName,
    officialUrl: scholarship.officialUrl,
    contentHash: scholarship.contentHash,
  };
  const weakest = weakestCriterion(scholarship.criteria);
  if (!weakest) return { ...base, reason: 'no criteria' };
  return { ...base, reason: 'low confidence', criterion: weakest };
}
