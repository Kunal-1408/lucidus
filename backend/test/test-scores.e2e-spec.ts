import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

// One fixture page asking for an ATAR and one asking for a SAT score. Each is
// ingested by the rules alone (the fake LLM finds nothing) and matched
// through the endpoint.
const PAGES = {
  'Example Australian ATAR Scholarship': 'test-scores/atar.html',
  'Example US SAT Scholarship': 'test-scores/sat.html',
};
type Name = keyof typeof PAGES;

const urlOf = (name: string) =>
  `https://example.org/${name.toLowerCase().replace(/\s+/g, '-')}`;

const ENTRIES: WatchlistEntry[] = Object.keys(PAGES).map((name) => ({
  url: urlOf(name),
  type: 'html',
  region: 'abroad',
  name,
  provider: 'Example provider',
  scholarshipType: 'corporate',
  officialUrl: urlOf(name),
  holds: 'one',
}));

type Bucket = 'eligible' | 'withinReach' | 'tellUsMore' | 'hidden';

describe('ATAR and SAT, through the Match endpoint', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: Object.fromEntries(
        Object.entries(PAGES).map(([name, file]) => [urlOf(name), file]),
      ),
      now: new Date('2026-07-20T09:00:00Z'),
      watchlist: ENTRIES,
    });
    const summary = await harness.ingest();
    expect(summary.counts.extracted).toBe(2);
  });

  afterAll(() => harness.close());

  async function cardOf(profile: object, name: Name) {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    for (const bucket of ['eligible', 'withinReach', 'tellUsMore'] as const) {
      const card = (
        res.body[bucket] as { name: string; missing: unknown[] }[]
      ).find((c) => c.name === name);
      if (card) return { bucket: bucket as Bucket, missing: card.missing };
    }
    return { bucket: 'hidden' as Bucket, missing: [] };
  }

  it.each<[string, object, Bucket]>([
    ['an ATAR above it', { countryOfResidence: 'AU', atar: 97.5 }, 'eligible'],
    [
      'an ATAR of exactly 95',
      { countryOfResidence: 'AU', atar: 95 },
      'eligible',
    ],
    ['an ATAR below it', { countryOfResidence: 'AU', atar: 90 }, 'hidden'],
    ['no ATAR', { countryOfResidence: 'AU' }, 'tellUsMore'],
  ])('an ATAR of at least 95: %s', async (_, profile, bucket) => {
    const card = await cardOf(profile, 'Example Australian ATAR Scholarship');
    expect(card.bucket).toBe(bucket);
  });

  it.each<[string, object, Bucket]>([
    ['a SAT score above it', { destination: 'US', sat: 1500 }, 'eligible'],
    [
      'a SAT score of exactly 1400 on the US board',
      { board: 'us_high_school', sat: 1400 },
      'eligible',
    ],
    ['a SAT score below it', { destination: 'US', sat: 1200 }, 'hidden'],
    ['no SAT score', { destination: 'US' }, 'tellUsMore'],
  ])('a SAT score of at least 1400: %s', async (_, profile, bucket) => {
    const card = await cardOf(profile, 'Example US SAT Scholarship');
    expect(card.bucket).toBe(bucket);
  });

  it('names the score that would settle each', async () => {
    const atar = await cardOf(
      { countryOfResidence: 'AU' },
      'Example Australian ATAR Scholarship',
    );
    expect(atar.missing).toEqual([{ field: 'atar', label: 'ATAR' }]);
    const sat = await cardOf(
      { destination: 'US' },
      'Example US SAT Scholarship',
    );
    expect(sat.missing).toEqual([{ field: 'sat', label: 'SAT score' }]);
  });
});
