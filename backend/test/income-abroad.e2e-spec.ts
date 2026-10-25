import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

// An SPDC-style page whose income limit is monthly, in US dollars, ingested
// by the rules alone (the fake LLM finds nothing) and matched through the
// endpoint: the limit is twelve months of US$ 5,000, and an income in any
// other currency can't be judged against it.
const NAME = 'Example Diaspora Children Scholarship';
const URL = 'https://example.org/example-diaspora-children-scholarship';

const ENTRY: WatchlistEntry = {
  url: URL,
  type: 'html',
  region: 'abroad',
  name: NAME,
  provider: 'Example provider',
  scholarshipType: 'government',
  officialUrl: URL,
  holds: 'one',
};

type Bucket = 'eligible' | 'withinReach' | 'tellUsMore' | 'hidden';

describe('Family income abroad, through the Match endpoint', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: { [URL]: 'abroad/usd-monthly-income.html' },
      now: new Date('2026-07-20T09:00:00Z'),
      watchlist: [ENTRY],
    });
    const summary = await harness.ingest();
    expect(summary.counts.extracted).toBe(1);
  });

  afterAll(() => harness.close());

  async function bucketOf(profile: object): Promise<Bucket> {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    for (const bucket of ['eligible', 'withinReach', 'tellUsMore'] as const) {
      const names = (res.body[bucket] as { name: string }[]).map((c) => c.name);
      if (names.includes(NAME)) return bucket;
    }
    return 'hidden';
  }

  const inDubai = (currency: string, value: number) => ({
    countryOfResidence: 'AE',
    incomeAmount: { currency, value },
  });

  it.each<[string, object, Bucket]>([
    [
      'a yearly income under twelve months of the limit',
      inDubai('USD', 59000),
      'eligible',
    ],
    [
      'a yearly income of exactly twelve months of the limit',
      inDubai('USD', 60000),
      'eligible',
    ],
    [
      'a yearly income over twelve months of the limit',
      inDubai('USD', 61000),
      'hidden',
    ],
    [
      'an income in dirhams, which is never converted',
      inDubai('AED', 100000),
      'tellUsMore',
    ],
    [
      'a Student abroad who gives no income',
      { countryOfResidence: 'AE' },
      'tellUsMore',
    ],
    [
      'a Student in India who gives a rupee band',
      { countryOfResidence: 'IN', incomeBand: 'under_1l' },
      'tellUsMore',
    ],
  ])('a monthly limit in US dollars: %s', async (_, profile, bucket) => {
    expect(await bucketOf(profile)).toBe(bucket);
  });

  it('asks for the family income it needs, in the currency that would settle it', async () => {
    const res = await harness
      .http()
      .post('/api/match')
      .send(inDubai('AED', 100000))
      .expect(200);
    const card = (
      res.body.tellUsMore as { name: string; missing: unknown[] }[]
    ).find((c) => c.name === NAME);
    expect(card?.missing).toEqual([
      { field: 'incomeAmount', label: 'family income in USD' },
    ]);
  });
});
