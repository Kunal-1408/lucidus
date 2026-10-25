import type { Types } from 'mongoose';
import {
  isSkipped,
  type Override,
  type SkippedResult,
} from '../overrides/override.schema.js';
import {
  type ScholarshipKey,
  scholarshipKey,
} from '../scholarships/scholarship-key.js';
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

// An Override for the current text that the last run skipped. Invalid: a
// replacement Criterion's sentence isn't on the page or its values aren't
// allowed. Lapsed: it names a field Criteria no longer check, or approved an
// extraction read again since; it is kept, and the Scholarship is checked
// again.
export interface SkippedOverrideEntry extends ReviewEntryBase {
  reason: 'invalid override' | 'override lapsed';
  overrideId: string;
  problems: string[];
  note: string;
}

const SKIPPED_REASONS: Record<SkippedResult, SkippedOverrideEntry['reason']> = {
  invalid: 'invalid override',
  lapsed: 'override lapsed',
};

// An Override written against text the page no longer has. It is kept but
// no longer holds, so the Scholarship is checked again.
export interface PageChangedEntry extends ReviewEntryBase {
  reason: 'page changed';
  overrideId: string;
  oldHash: string;
  newHash: string;
  note: string;
}

// One line of the Review report. Each reason is its own shape; a new reason
// joins this union and gets its own builder.
export type ReviewEntry =
  | LowConfidenceEntry
  | NoCriteriaEntry
  | SkippedOverrideEntry
  | PageChangedEntry;

export type StoredScholarship = Scholarship & { _id: Types.ObjectId };
export type StoredOverride = Override & { _id: Types.ObjectId };

// The filter for Scholarships the Review report lists: listed, but hidden
// from Students until a person checks them.
export const NEEDING_REVIEW = { status: 'active', needsReview: true } as const;

// Why a Scholarship needs review. Zero Criteria are stored high Confidence
// with needs review set, so they are told apart by the empty list;
// otherwise the weakest Criterion is the first low one.
export function scholarshipEntry(scholarship: StoredScholarship): ReviewEntry {
  const base = entryBase(scholarship);
  const weakest = weakestCriterion(scholarship.criteria);
  if (!weakest) return { ...base, reason: 'no criteria' };
  return { ...base, reason: 'low confidence', criterion: weakest };
}

// The entries for these Overrides, in their order, given the listed
// Scholarships among theirs. An Override whose Scholarship is no longer
// listed has nothing left to check, so it isn't reported.
export function overrideEntries(
  overrides: StoredOverride[],
  listed: StoredScholarship[],
): ReviewEntry[] {
  const byKey = new Map(
    listed.map((scholarship) => [keyOf(scholarship), scholarship]),
  );
  return overrides.flatMap((override) => {
    const scholarship = byKey.get(keyOf(override));
    const entry = scholarship && overrideEntry(override, scholarship);
    return entry ? [entry] : [];
  });
}

function keyOf(record: ScholarshipKey): string {
  return JSON.stringify(scholarshipKey(record));
}

// What is wrong with an Override for this (listed) Scholarship, if
// anything. A changed page comes first: problems found against the old text
// no longer matter.
function overrideEntry(
  override: StoredOverride,
  scholarship: StoredScholarship,
): ReviewEntry | undefined {
  const base = entryBase(scholarship);
  const about = { overrideId: override._id.toHexString(), note: override.note };
  if (override.contentHash !== scholarship.contentHash) {
    return {
      ...base,
      reason: 'page changed',
      ...about,
      oldHash: override.contentHash,
      newHash: scholarship.contentHash,
    };
  }
  if (isSkipped(override.lastResult)) {
    return {
      ...base,
      reason: SKIPPED_REASONS[override.lastResult],
      ...about,
      problems: override.problems ?? [],
    };
  }
  return undefined;
}

function entryBase(scholarship: StoredScholarship): ReviewEntryBase {
  return {
    id: scholarship._id.toHexString(),
    name: scholarship.name,
    sourceUrl: scholarship.sourceUrl,
    schemeName: scholarship.schemeName,
    officialUrl: scholarship.officialUrl,
    contentHash: scholarship.contentHash,
  };
}
