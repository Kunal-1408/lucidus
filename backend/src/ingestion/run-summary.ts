import type { LastResult } from '../watchlist/watchlist-entry.schema.js';

// The counters a run summary reports. Adding a counter means adding its name
// here; every run then starts it at zero.
export const COUNT_NAMES = [
  'fetched', // sources that returned content
  'unchanged', // Scholarships skipped because their content hash matched
  'extracted', // Scholarships extracted and upserted
  'inactive', // Scholarships marked inactive
  'failed', // sources left untouched by a fetch or extraction failure
  'needs_js', // sources whose cleaned text was too short to extract from
  'empty', // many-scholarship sources whose split found no Scholarships
  'worqnow_failed', // University pointer countries whose WorqNow fetch failed
] as const;

export type CountName = (typeof COUNT_NAMES)[number];
export type RunCounts = Record<CountName, number>;

export function zeroCounts(): RunCounts {
  return Object.fromEntries(COUNT_NAMES.map((n) => [n, 0])) as RunCounts;
}

// What happened to one Watchlist source; `result` is also stored as the
// entry's last result.
export interface SourceOutcome {
  url: string;
  result: LastResult;
  // Why a source failed, for the operator.
  detail?: string;
}

export type RunState = 'running' | 'finished' | 'failed' | 'interrupted';

export interface RunSummary {
  runId: string;
  state: RunState;
  startedAt: Date;
  finishedAt?: Date;
  counts: RunCounts;
  sources: SourceOutcome[];
}
