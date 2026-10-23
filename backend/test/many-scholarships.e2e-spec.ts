import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

const SCHEMES = 'https://education.example.gov.in/schemes';
const PORTAL = 'https://scholarships.example.gov.in';

const DAY_1 = new Date('2026-07-20T09:00:00Z');
const DAY_2 = new Date('2026-07-27T09:00:00Z');

const MANY: WatchlistEntry = {
  url: SCHEMES,
  type: 'html',
  region: 'india',
  name: 'Example State scholarship schemes',
  provider: 'Example State Education Department',
  scholarshipType: 'government',
  officialUrl: PORTAL,
  holds: 'many',
  split: { splitSelector: 'h2' },
};

describe('An HTML source holding many Scholarships', () => {
  let harness: Harness;

  // Every visible Scholarship: an empty Profile leaves no one Ineligible.
  async function listed() {
    const res = await harness.http().post('/api/match').send({}).expect(200);
    const body = res.body as Record<string, Card[]>;
    return [...body.eligible, ...body.withinReach, ...body.tellUsMore].sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }

  beforeEach(async () => {
    harness = await startApp({
      fixtures: { [SCHEMES]: 'many/schemes-v1.html' },
      watchlist: [MANY],
      now: DAY_1,
    });
  });

  afterEach(() => harness.close());

  it('becomes one Scholarship per heading, named from the heading', async () => {
    const summary = await harness.ingest();
    expect(summary).toMatchObject({
      counts: { fetched: 1, extracted: 3, unchanged: 0 },
      sources: [{ url: SCHEMES, result: 'ok' }],
    });
    expect(await listed()).toEqual([
      expect.objectContaining({
        name: 'Merit Scholarship for Class 9',
        amountText: 'Rs. 6,000 per annum',
      }),
      expect.objectContaining({
        name: 'Pragati Scholarship for Girls',
        amountText: 'Rs. 10,000 per annum',
      }),
      expect.objectContaining({
        name: 'Science Talent Award',
        amountText: 'Rs. 20,000',
      }),
    ]);
  });

  it('takes provider and official URL from the entry, unless a section links to its own official site', async () => {
    await harness.ingest();
    expect(await listed()).toEqual([
      expect.objectContaining({
        name: 'Merit Scholarship for Class 9',
        provider: 'Example State Education Department',
        officialUrl: 'https://merit.example.gov.in/apply',
      }),
      expect.objectContaining({
        name: 'Pragati Scholarship for Girls',
        provider: 'Example State Education Department',
        officialUrl: PORTAL,
      }),
      expect.objectContaining({
        name: 'Science Talent Award',
        provider: 'Example State Education Department',
        officialUrl: PORTAL,
      }),
    ]);
  });

  describe('on a rerun', () => {
    beforeEach(async () => {
      await harness.ingest();
      harness.setNow(DAY_2);
    });

    it('re-extracts only the section that changed', async () => {
      harness.serve(SCHEMES, 'many/schemes-edited.html');
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 1, extracted: 1, unchanged: 2, inactive: 0 },
        sources: [{ url: SCHEMES, result: 'ok' }],
      });
      expect(await listed()).toEqual([
        expect.objectContaining({
          name: 'Merit Scholarship for Class 9',
          lastVerified: DAY_2.toISOString(),
        }),
        expect.objectContaining({
          name: 'Pragati Scholarship for Girls',
          amountText: 'Rs. 15,000 per annum',
        }),
        expect.objectContaining({
          name: 'Science Talent Award',
          lastVerified: DAY_2.toISOString(),
        }),
      ]);
    });

    it('reports the source unchanged when no section changed', async () => {
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 1, extracted: 0, unchanged: 3 },
        sources: [{ url: SCHEMES, result: 'unchanged' }],
      });
    });

    it('marks a scheme the page no longer lists inactive', async () => {
      harness.serve(SCHEMES, 'many/schemes-removed.html');
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 1, extracted: 0, unchanged: 2, inactive: 1 },
        sources: [{ url: SCHEMES, result: 'unchanged' }],
      });
      expect((await listed()).map((s) => s.name)).toEqual([
        'Merit Scholarship for Class 9',
        'Pragati Scholarship for Girls',
      ]);
    });

    it('treats a renamed scheme as one inactive and one new Scholarship', async () => {
      harness.serve(SCHEMES, 'many/schemes-renamed.html');
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 1, extracted: 1, unchanged: 2, inactive: 1 },
        sources: [{ url: SCHEMES, result: 'ok' }],
      });
      expect((await listed()).map((s) => s.name)).toEqual([
        'Merit Scholarship for Class 9',
        'Pragati Scholarship for Girls',
        'Science Talent Scholarship',
      ]);
    });

    it('lists a scheme again when the page brings it back', async () => {
      harness.serve(SCHEMES, 'many/schemes-removed.html');
      await harness.ingest();
      harness.serve(SCHEMES, 'many/schemes-v1.html');
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { extracted: 0, unchanged: 3, inactive: 0 },
      });
      expect(await listed()).toHaveLength(3);
    });

    it('flags a split that finds nothing empty and leaves the Scholarships alone', async () => {
      harness.serve(SCHEMES, 'many/schemes-no-headings.html');
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 1, empty: 1, extracted: 0, inactive: 0 },
        sources: [{ url: SCHEMES, result: 'empty' }],
      });
      expect(await listed()).toEqual([
        expect.objectContaining({
          name: 'Merit Scholarship for Class 9',
          lastVerified: DAY_1.toISOString(),
        }),
        expect.objectContaining({
          name: 'Pragati Scholarship for Girls',
          lastVerified: DAY_1.toISOString(),
        }),
        expect.objectContaining({
          name: 'Science Talent Award',
          lastVerified: DAY_1.toISOString(),
        }),
      ]);
    });
  });
});

interface Card {
  name: string;
  provider: string;
  amountText: string;
  officialUrl: string;
  lastVerified: string;
}
