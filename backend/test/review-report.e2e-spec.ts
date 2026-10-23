import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

const ENGINEERING = 'https://example.org/engineering-girls';
const ENGINEERING_NAME = 'Example Engineering Girls Scholarship';
const OPEN = 'https://example.org/open-merit';
const OPEN_NAME = 'Example Open Merit Award';
const DAY_1 = new Date('2026-07-20T09:00:00Z');

const entry = (url: string, name: string): WatchlistEntry => ({
  url,
  type: 'html',
  region: 'india',
  name,
  provider: 'Example Foundation',
  scholarshipType: 'corporate',
  officialUrl: url,
  holds: 'one',
});

// Not on the page, so the LLM's Criterion stays low.
const NOT_ON_PAGE = 'Only engineering aspirants may apply.';

describe('Review report', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startApp({
      fixtures: {
        [ENGINEERING]: 'llm/engineering-girls.html',
        [OPEN]: 'review/no-criteria.html',
      },
      watchlist: [entry(ENGINEERING, ENGINEERING_NAME), entry(OPEN, OPEN_NAME)],
      now: DAY_1,
      llm: (request) =>
        request.text.includes(ENGINEERING_NAME)
          ? {
              criteria: [
                {
                  field: 'fieldOfStudy',
                  values: ['engineering'],
                  quote: NOT_ON_PAGE,
                },
              ],
            }
          : {},
    });
  });

  afterEach(() => harness.close());

  async function report() {
    const res = await harness
      .http()
      .get('/api/admin/review')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    return res.body as { name: string }[];
  }

  it('needs the admin token', async () => {
    await harness.http().get('/api/admin/review').expect(401);
    await harness
      .http()
      .get('/api/admin/review')
      .set('x-admin-token', 'wrong')
      .expect(401);
  });

  it('is empty before anything needs review', async () => {
    expect(await report()).toEqual([]);
  });

  it('lists a low Scholarship with its weakest Criterion and that sentence', async () => {
    await harness.ingest();
    expect(await report()).toContainEqual({
      reason: 'low confidence',
      id: expect.any(String),
      name: ENGINEERING_NAME,
      sourceUrl: ENGINEERING,
      schemeName: ENGINEERING_NAME,
      officialUrl: ENGINEERING,
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      criterion: {
        field: 'fieldOfStudy',
        op: 'in',
        value: ['engineering'],
        changeable: false,
        sourceText: NOT_ON_PAGE,
        confidence: 'low',
      },
    });
  });

  it('lists a Scholarship with zero Criteria under its own reason', async () => {
    await harness.ingest();
    expect(await report()).toContainEqual({
      reason: 'no criteria',
      id: expect.any(String),
      name: OPEN_NAME,
      sourceUrl: OPEN,
      schemeName: OPEN_NAME,
      officialUrl: OPEN,
      contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('keeps every Scholarship it lists hidden from Match', async () => {
    await harness.ingest();
    expect((await report()).map((entry) => entry.name).sort()).toEqual([
      ENGINEERING_NAME,
      OPEN_NAME,
    ]);
    // An empty Profile would list every visible Scholarship.
    const res = await harness.http().post('/api/match').send({}).expect(200);
    expect(res.body).toMatchObject({
      eligible: [],
      withinReach: [],
      tellUsMore: [],
    });
  });

  it('drops a Scholarship once it goes inactive', async () => {
    await harness.ingest();
    harness.serve(OPEN, { status: 404 });
    await harness.ingest();
    expect(await report()).toEqual([
      expect.objectContaining({ name: ENGINEERING_NAME }),
    ]);
  });
});
