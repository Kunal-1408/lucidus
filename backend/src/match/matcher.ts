import type {
  ConfidenceLevel,
  Criterion,
} from '../scholarships/scholarship.schema.js';
import type { Profile } from './profile.js';

// The slice of a Scholarship the Matcher needs: visible records only.
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
}

export interface Card {
  id: string;
  name: string;
  provider: string;
  amountText: string;
  officialUrl: string;
  deadline?: string;
  lastVerified: string;
  confidence: ConfidenceLevel;
}

export interface MatchResult {
  prompts: unknown[];
  eligible: Card[];
  withinReach: Card[];
  tellUsMore: Card[];
  universityPointers: unknown[];
}

type Outcome = 'pass' | 'fail' | 'unknown';

// Checks a Profile against every visible Scholarship. So far only the
// Eligible bucket is filled: every Criterion passes.
export function match(
  profile: Profile,
  scholarships: MatchableScholarship[],
): MatchResult {
  const eligible = scholarships
    .filter((s) => s.criteria.every((c) => evaluate(c, profile) === 'pass'))
    .map(toCard);
  return {
    prompts: [],
    eligible,
    withinReach: [],
    tellUsMore: [],
    universityPointers: [],
  };
}

function evaluate(criterion: Criterion, profile: Profile): Outcome {
  const answer = (profile as Record<string, unknown>)[criterion.field];
  if (answer === undefined || answer === null) return 'unknown';
  const { op, value } = criterion;
  const passes =
    (op === 'eq' && answer === value) ||
    (op === 'in' && Array.isArray(value) && value.includes(answer)) ||
    (op === 'lte' && Number(answer) <= Number(value)) ||
    (op === 'gte' && Number(answer) >= Number(value));
  return passes ? 'pass' : 'fail';
}

function toCard(s: MatchableScholarship): Card {
  return {
    id: s.id,
    name: s.name,
    provider: s.provider,
    amountText: s.amountText,
    officialUrl: s.officialUrl,
    deadline: s.deadline,
    lastVerified: s.lastVerified.toISOString(),
    confidence: s.confidence,
  };
}
