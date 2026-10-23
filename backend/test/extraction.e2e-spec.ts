import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

const URL = 'https://example.org/scholarship';

const ENTRY: WatchlistEntry = {
  url: URL,
  type: 'html',
  region: 'india',
  name: 'Example Scholarship',
  provider: 'Example Foundation',
  scholarshipType: 'corporate',
  officialUrl: URL,
  holds: 'one',
};

describe('Ingestion extracts every new or changed Scholarship', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: { [URL]: 'santoor-scholarship.html' },
      now: new Date('2026-07-20T09:00:00Z'),
      watchlist: [ENTRY],
    });
  });

  afterAll(() => harness.close());

  async function cardsFor(profile: object) {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    return [...res.body.eligible, ...res.body.withinReach] as {
      deadline?: string;
      deadlineStatus: string;
      amountText: string;
    }[];
  }

  it('shows the deadline and Amount text the page states', async () => {
    await harness.ingest();
    expect(await cardsFor({ gender: 'female', class: 12 })).toEqual([
      expect.objectContaining({
        deadline: '2026-10-15',
        deadlineStatus: 'open',
        amountText: 'Rs. 30,000 per annum',
      }),
    ]);
  });

  it('re-extracts a changed page, dropping a deadline it no longer states', async () => {
    harness.serve(URL, 'lifecycle/girls-class-11.html');
    const summary = await harness.ingest();
    expect(summary.counts.extracted).toBe(1);
    const [card] = await cardsFor({ gender: 'female', class: 11 });
    expect(card.deadline).toBeUndefined();
    expect(card.deadlineStatus).toBe('not_announced');
  });
});
