import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

const GIRLS = 'https://example.org/girls-merit';
const DAY_1 = new Date('2026-07-20T09:00:00Z');

const WATCHLIST: WatchlistEntry[] = [
  {
    url: GIRLS,
    type: 'html',
    region: 'india',
    name: 'Example Girls Merit Scholarship',
    provider: 'Example Foundation',
    scholarshipType: 'corporate',
    officialUrl: GIRLS,
    holds: 'one',
  },
];

const UK_LABEL =
  'Universities in the UK with international scholarships. Not checked against your profile; see their site for details.';

describe('University pointers', () => {
  let harness: Harness;

  async function matchFor(profile: object) {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    return res.body as {
      eligible: { name: string }[];
      withinReach: { name: string }[];
      tellUsMore: { name: string }[];
      prompts: unknown[];
      universityPointers: unknown[];
    };
  }

  afterEach(() => harness.close());

  it('shows the names WorqNow lists for the destination, under the label, after a run', async () => {
    harness = await startApp({
      fixtures: { [GIRLS]: 'lifecycle/girls-class-10.html' },
      watchlist: WATCHLIST,
      now: DAY_1,
      worqnow: {
        uk: [
          { code: 'portsmouth', name: 'University of Portsmouth' },
          { code: 'edinburgh', name: 'University of Edinburgh' },
        ],
        usa: [{ code: 'mit', name: 'Massachusetts Institute of Technology' }],
      },
    });
    await harness.ingest();

    const result = await matchFor({ destination: 'uk' });

    expect(result.universityPointers).toEqual([
      {
        country: 'uk',
        label: UK_LABEL,
        names: ['University of Edinburgh', 'University of Portsmouth'],
      },
    ]);
  });

  describe('with every country listed', () => {
    beforeEach(async () => {
      harness = await startApp({
        fixtures: { [GIRLS]: 'lifecycle/girls-class-10.html' },
        watchlist: WATCHLIST,
        now: DAY_1,
        worqnow: {
          uk: [{ code: 'edinburgh', name: 'University of Edinburgh' }],
          usa: [{ code: 'mit', name: 'Massachusetts Institute of Technology' }],
          canada: [{ code: 'toronto', name: 'University of Toronto' }],
          australia: [{ code: 'melbourne', name: 'University of Melbourne' }],
        },
      });
      await harness.ingest();
    });

    it.each([
      ['usa', 'the USA', 'Massachusetts Institute of Technology'],
      ['canada', 'Canada', 'University of Toronto'],
      ['australia', 'Australia', 'University of Melbourne'],
    ])(
      'names the country in the label for %s',
      async (destination, country, name) => {
        const result = await matchFor({ destination });

        expect(result.universityPointers).toEqual([
          {
            country: destination,
            label: `Universities in ${country} with international scholarships. Not checked against your profile; see their site for details.`,
            names: [name],
          },
        ]);
      },
    );

    it.each([['india'], ['germany'], ['other']])(
      'returns no pointers for a destination of %s',
      async (destination) => {
        expect((await matchFor({ destination })).universityPointers).toEqual(
          [],
        );
      },
    );

    it('returns no pointers when the Profile has no destination', async () => {
      expect((await matchFor({})).universityPointers).toEqual([]);
    });

    it('keeps pointers out of the buckets and Prompts', async () => {
      const result = await matchFor({
        destination: 'uk',
        gender: 'female',
        class: 10,
      });

      const shown = JSON.stringify([
        result.eligible,
        result.withinReach,
        result.tellUsMore,
        result.prompts,
      ]);
      expect(shown).not.toContain('University of Edinburgh');
      expect(result.eligible.map((c) => c.name)).toEqual([
        'Example Girls Merit Scholarship',
      ]);
    });
  });

  describe('a later run', () => {
    beforeEach(async () => {
      harness = await startApp({
        fixtures: { [GIRLS]: 'lifecycle/girls-class-10.html' },
        watchlist: WATCHLIST,
        now: DAY_1,
        worqnow: {
          uk: [{ code: 'edinburgh', name: 'University of Edinburgh' }],
          usa: [{ code: 'mit', name: 'Massachusetts Institute of Technology' }],
        },
      });
      await harness.ingest();
    });

    it("replaces a country's pointers with WorqNow's new list", async () => {
      harness.serveWorqNow('uk', [
        { code: 'glasgow', name: 'University of Glasgow' },
      ]);

      const summary = await harness.ingest();

      expect(summary.counts.worqnow_failed).toBe(0);
      expect(summary.universityPointers).toContainEqual({
        country: 'uk',
        result: 'ok',
      });
      expect(
        (await matchFor({ destination: 'uk' })).universityPointers,
      ).toEqual([
        expect.objectContaining({ names: ['University of Glasgow'] }),
      ]);
    });

    it('keeps the previous list for a country whose fetch fails, and reports it', async () => {
      harness.serveWorqNow('uk', { failure: 'WorqNow answered 503' });
      harness.serveWorqNow('usa', [
        { code: 'stanford', name: 'Stanford University' },
      ]);

      const summary = await harness.ingest();

      expect(summary.state).toBe('finished');
      expect(summary.counts.worqnow_failed).toBe(1);
      expect(summary.universityPointers).toEqual([
        { country: 'uk', result: 'failed', detail: 'WorqNow answered 503' },
        { country: 'usa', result: 'ok' },
        { country: 'canada', result: 'ok' },
        { country: 'australia', result: 'ok' },
      ]);
      // WorqNow is not a Watchlist source.
      expect(summary.sources).toEqual([{ url: GIRLS, result: 'unchanged' }]);
      expect(
        (await matchFor({ destination: 'uk' })).universityPointers,
      ).toEqual([
        expect.objectContaining({ names: ['University of Edinburgh'] }),
      ]);
      expect(
        (await matchFor({ destination: 'usa' })).universityPointers,
      ).toEqual([expect.objectContaining({ names: ['Stanford University'] })]);
    });

    it('keeps the previous list for a country whose new list cannot be stored, and reports it', async () => {
      // A university with no code can't be stored as a pointer.
      harness.serveWorqNow('uk', [
        { code: 'glasgow', name: 'University of Glasgow' },
        { code: '' },
      ]);

      const summary = await harness.ingest();

      expect(summary.counts.worqnow_failed).toBe(1);
      expect(summary.universityPointers).toContainEqual({
        country: 'uk',
        result: 'failed',
        detail: expect.any(String),
      });
      expect(
        (await matchFor({ destination: 'uk' })).universityPointers,
      ).toEqual([
        expect.objectContaining({ names: ['University of Edinburgh'] }),
      ]);
    });

    it('returns no group for a destination WorqNow lists no universities for', async () => {
      expect(
        (await matchFor({ destination: 'canada' })).universityPointers,
      ).toEqual([]);
    });
  });

  describe('names', () => {
    it('falls back to the title-cased code, corrected by the names file', async () => {
      harness = await startApp({
        fixtures: { [GIRLS]: 'lifecycle/girls-class-10.html' },
        watchlist: WATCHLIST,
        now: DAY_1,
        worqnow: {
          uk: [
            { code: 'kings-college-london' },
            { code: 'ucl' },
            { code: 'edinburgh', name: 'University of Edinburgh' },
          ],
        },
      });
      await harness.ingest();

      const [group] = (await matchFor({ destination: 'uk' }))
        .universityPointers as { names: string[] }[];

      expect(group.names).toEqual([
        'Kings College London',
        'University College London',
        'University of Edinburgh',
      ]);
    });
  });
});
