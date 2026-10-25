import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

const DAY_1 = new Date('2026-07-20T09:00:00Z');
const DAY_2 = new Date('2026-07-27T09:00:00Z');

const PORTAL = 'https://scholarships.example.gov.in';

function entry(
  url: string,
  type: WatchlistEntry['type'],
  more: Partial<WatchlistEntry> = {},
): WatchlistEntry {
  return {
    url,
    type,
    region: 'india',
    name: 'Example scholarship',
    provider: 'Example State Education Department',
    scholarshipType: 'government',
    officialUrl: PORTAL,
    holds: 'one',
    ...more,
  };
}

interface Card {
  name: string;
  provider: string;
  amountText: string;
  officialUrl: string;
  lastVerified: string;
  confidence: string;
}

describe('PDF and JSON sources', () => {
  let harness: Harness;

  afterEach(() => harness.close());

  async function match(profile: object) {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    return res.body as Record<
      'eligible' | 'withinReach' | 'tellUsMore',
      Card[]
    >;
  }

  // Every visible Scholarship: an empty Profile leaves no one Ineligible.
  async function listed() {
    const body = await match({});
    return [...body.eligible, ...body.withinReach, ...body.tellUsMore].sort(
      (a, b) => a.name.localeCompare(b.name),
    );
  }

  describe('a PDF holding one Scholarship', () => {
    const GUIDELINES = 'https://example.org/kanya-vidya.pdf';

    beforeEach(async () => {
      harness = await startApp({
        fixtures: { [GUIDELINES]: 'pdf/girls-class-10.pdf' },
        watchlist: [
          entry(GUIDELINES, 'pdf', { name: 'Kanya Vidya Scholarship' }),
        ],
        now: DAY_1,
      });
    });

    it('is extracted from the PDF text', async () => {
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 1, extracted: 1 },
        sources: [{ url: GUIDELINES, result: 'ok' }],
      });
      const { eligible } = await match({
        gender: 'female',
        class: 10,
        incomeBand: 'under_1l',
      });
      expect(eligible).toEqual([
        expect.objectContaining({
          name: 'Kanya Vidya Scholarship',
          amountText: 'Rs. 12,000 per annum',
          deadline: '2026-10-31',
          confidence: 'high',
        }),
      ]);
      expect((await match({ gender: 'male', class: 10 })).eligible).toEqual([]);
    });

    it('is left unchanged when the PDF is the same on a rerun', async () => {
      await harness.ingest();
      harness.setNow(DAY_2);
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 1, extracted: 0, unchanged: 1 },
        sources: [{ url: GUIDELINES, result: 'unchanged' }],
      });
    });
  });

  describe('a PDF holding many Scholarships', () => {
    const SCHEMES = 'https://education.example.gov.in/schemes-2026.pdf';

    beforeEach(async () => {
      harness = await startApp({
        fixtures: { [SCHEMES]: 'pdf/schemes-v1.pdf' },
        watchlist: [
          entry(SCHEMES, 'pdf', {
            holds: 'many',
            // The captured group, when there is one, is the scheme name.
            split: { splitPattern: String.raw`^Scheme \d+: (.+)$` },
          }),
        ],
        now: DAY_1,
      });
      await harness.ingest();
    });

    it('becomes one Scholarship per matching line, each running to the next', async () => {
      expect(await listed()).toEqual([
        expect.objectContaining({
          name: 'Merit Scholarship for Class 9',
          amountText: 'Rs. 6,000 per annum',
          officialUrl: PORTAL,
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

    describe('on a rerun', () => {
      beforeEach(() => harness.setNow(DAY_2));

      it('re-extracts only the section that changed', async () => {
        harness.serve(SCHEMES, 'pdf/schemes-edited.pdf');
        const summary = await harness.ingest();
        expect(summary).toMatchObject({
          counts: { fetched: 1, extracted: 1, unchanged: 2, inactive: 0 },
          sources: [{ url: SCHEMES, result: 'ok' }],
        });
        expect(await listed()).toEqual([
          expect.objectContaining({ lastVerified: DAY_2.toISOString() }),
          expect.objectContaining({ amountText: 'Rs. 15,000 per annum' }),
          expect.objectContaining({ lastVerified: DAY_2.toISOString() }),
        ]);
      });

      it('marks a scheme the PDF no longer lists inactive', async () => {
        harness.serve(SCHEMES, 'pdf/schemes-removed.pdf');
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

      it('flags a split that matches no line empty and leaves the Scholarships alone', async () => {
        harness.serve(SCHEMES, 'pdf/schemes-no-match.pdf');
        const summary = await harness.ingest();
        expect(summary).toMatchObject({
          counts: { fetched: 1, empty: 1, extracted: 0, inactive: 0 },
          sources: [{ url: SCHEMES, result: 'empty' }],
        });
        expect(await listed()).toHaveLength(3);
      });
    });
  });

  describe('a JSON source holding one Scholarship', () => {
    const API = 'https://example.org/api/kanya-vidya';
    const GIRL = {
      gender: 'female',
      class: 10,
      category: 'sc',
      incomeBand: 'under_1l',
    };

    beforeEach(async () => {
      harness = await startApp({
        fixtures: { [API]: 'json/kanya-vidya.json' },
        watchlist: [entry(API, 'json', { name: 'Kanya Vidya Scholarship' })],
        now: DAY_1,
      });
    });

    it('is extracted from the text of its fields', async () => {
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 1, extracted: 1 },
        sources: [{ url: API, result: 'ok' }],
      });
      expect((await match(GIRL)).eligible).toEqual([
        expect.objectContaining({
          name: 'Kanya Vidya Scholarship',
          amountText: 'Rs. 12,000 per annum',
          deadline: '2026-10-31',
          confidence: 'high',
        }),
      ]);
      // Girls are named only in prose.
      expect((await match({ ...GIRL, gender: 'male' })).eligible).toEqual([]);
    });

    it('takes structured fields that fit the fixed lists as Criteria', async () => {
      await harness.ingest();
      // No rule reads "class: 10" or "incomeBand: 250000"; the fields do.
      expect((await match({ ...GIRL, class: 12 })).eligible).toEqual([]);
      expect(
        (await match({ ...GIRL, incomeBand: '3l_4_5l' })).eligible,
      ).toEqual([]);
      expect(
        (await match({ ...GIRL, incomeBand: '1l_2l' })).eligible,
      ).toHaveLength(1);
      // Category values in the source's case still fit the fixed list.
      expect((await match({ ...GIRL, category: 'general' })).eligible).toEqual(
        [],
      );
      // "Atlantis" is no Indian state, so it restricts no one.
      expect(
        (await match({ ...GIRL, countryOfResidence: 'IN', region: 'IN-KL' }))
          .eligible,
      ).toHaveLength(1);
    });

    it('keeps a structured field high even when the LLM reads that field badly', async () => {
      harness.serveLlm(() => ({
        criteria: [
          { field: 'class', values: ['ug'], quote: 'Not on the page.' },
        ],
      }));
      await harness.ingest();
      expect((await match(GIRL)).eligible).toEqual([
        expect.objectContaining({ confidence: 'high' }),
      ]);
    });
  });

  describe('a JSON source holding many Scholarships', () => {
    const API = 'https://education.example.gov.in/api/schemes';
    const MANY_JSON = entry(API, 'json', {
      holds: 'many',
      split: { itemsPath: 'data.schemes', nameField: 'title' },
    });

    beforeEach(async () => {
      harness = await startApp({
        fixtures: { [API]: 'json/schemes-v1.json' },
        watchlist: [MANY_JSON],
        now: DAY_1,
      });
      await harness.ingest();
    });

    it('becomes one Scholarship per named item', async () => {
      expect(await listed()).toEqual([
        expect.objectContaining({
          name: 'Merit Scholarship for Class 9',
          amountText: 'Rs. 6,000 per annum',
          provider: 'Example State Education Department',
          officialUrl: PORTAL,
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

    it("takes each item's structured fields as its own Criteria", async () => {
      const science = { class: 12, stream: 'science' };
      const names = (cards: Card[]) => cards.map((c) => c.name);
      expect(names((await match(science)).eligible)).toEqual([
        'Science Talent Award',
      ]);
      // Its prose names no class; its "class" field does.
      expect(names((await match({ ...science, class: 11 })).eligible)).toEqual(
        [],
      );
    });

    describe('on a rerun', () => {
      beforeEach(() => harness.setNow(DAY_2));

      it('re-extracts only the item that changed', async () => {
        harness.serve(API, 'json/schemes-edited.json');
        const summary = await harness.ingest();
        expect(summary).toMatchObject({
          counts: { fetched: 1, extracted: 1, unchanged: 2, inactive: 0 },
          sources: [{ url: API, result: 'ok' }],
        });
        expect(await listed()).toEqual([
          expect.objectContaining({ lastVerified: DAY_2.toISOString() }),
          expect.objectContaining({ amountText: 'Rs. 15,000 per annum' }),
          expect.objectContaining({ lastVerified: DAY_2.toISOString() }),
        ]);
      });

      it('marks an item the feed no longer lists inactive', async () => {
        harness.serve(API, 'json/schemes-removed.json');
        const summary = await harness.ingest();
        expect(summary).toMatchObject({
          counts: { fetched: 1, extracted: 0, unchanged: 2, inactive: 1 },
          sources: [{ url: API, result: 'unchanged' }],
        });
        expect((await listed()).map((s) => s.name)).toEqual([
          'Merit Scholarship for Class 9',
          'Pragati Scholarship for Girls',
        ]);
      });

      it('flags a feed whose items path finds nothing empty and leaves the Scholarships alone', async () => {
        harness.serve(API, 'json/schemes-moved.json');
        const summary = await harness.ingest();
        expect(summary).toMatchObject({
          counts: { fetched: 1, empty: 1, extracted: 0, inactive: 0 },
          sources: [{ url: API, result: 'empty' }],
        });
        expect(await listed()).toHaveLength(3);
      });

      it('fails a feed that is not JSON and leaves the Scholarships alone', async () => {
        harness.serve(API, 'many/schemes-v1.html');
        const summary = await harness.ingest();
        expect(summary).toMatchObject({
          counts: { fetched: 0, failed: 1, inactive: 0 },
          sources: [{ url: API, result: 'failed' }],
        });
        expect(await listed()).toHaveLength(3);
      });
    });
  });

  it('replaces a needs_js page with the JSON endpoint it calls', async () => {
    const PAGE = 'https://education.example.gov.in/schemes';
    const API = 'https://education.example.gov.in/api/schemes';
    harness = await startApp({
      fixtures: {
        [PAGE]: 'lifecycle/js-shell.html',
        [API]: 'json/schemes-v1.json',
      },
      watchlist: [entry(PAGE, 'html')],
      now: DAY_1,
    });
    expect(await harness.ingest()).toMatchObject({
      sources: [{ url: PAGE, result: 'needs_js' }],
    });

    // The operator swaps the page for its endpoint on the Watchlist.
    const list = await harness
      .http()
      .get('/api/admin/watchlist')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    const [page] = list.body as { id: string }[];
    await harness
      .http()
      .delete(`/api/admin/watchlist/${page.id}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(204);
    await harness
      .http()
      .post('/api/admin/watchlist')
      .set('x-admin-token', ADMIN_TOKEN)
      .send(
        entry(API, 'json', {
          holds: 'many',
          split: { itemsPath: 'data.schemes', nameField: 'title' },
        }),
      )
      .expect(201);

    expect(await harness.ingest()).toMatchObject({
      counts: { fetched: 1, extracted: 3, needs_js: 0 },
      sources: [{ url: API, result: 'ok' }],
    });
    expect((await listed()).map((s) => s.name)).toEqual([
      'Merit Scholarship for Class 9',
      'Pragati Scholarship for Girls',
      'Science Talent Award',
    ]);
  });
});
