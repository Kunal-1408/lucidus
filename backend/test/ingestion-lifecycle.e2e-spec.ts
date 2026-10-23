import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import {
  ADMIN_TOKEN,
  Harness,
  Served,
  startApp,
  waitForRun,
} from './harness.js';

const GIRLS = 'https://example.org/girls-merit';
const BOYS = 'https://example.org/boys-science';

const DAY_1 = new Date('2026-07-20T09:00:00Z');
const DAY_2 = new Date('2026-07-27T09:00:00Z');

function entry(url: string, name: string): WatchlistEntry {
  return {
    url,
    type: 'html',
    region: 'india',
    name,
    provider: 'Example Foundation',
    scholarshipType: 'corporate',
    officialUrl: url,
    holds: 'one',
  };
}

const WATCHLIST = [
  entry(GIRLS, 'Example Girls Merit Scholarship'),
  entry(BOYS, 'Example Boys Science Scholarship'),
];

const GIRL_IN_CLASS_10 = { gender: 'female', class: 10 };
const BOY_IN_CLASS_12 = { gender: 'male', class: 12 };

describe('Ingestion run lifecycle', () => {
  let harness: Harness;

  async function eligibleFor(profile: object) {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    return res.body.eligible as { name: string; lastVerified: string }[];
  }

  afterEach(() => harness.close());

  describe('a first run over two new sources', () => {
    beforeEach(async () => {
      harness = await startApp({
        fixtures: {
          [GIRLS]: 'lifecycle/girls-class-10.html',
          [BOYS]: 'lifecycle/boys-class-12.html',
        },
        watchlist: WATCHLIST,
        now: DAY_1,
      });
    });

    it('returns 202 with a run ID at once, then a summary of the run', async () => {
      const res = await harness
        .http()
        .post('/api/admin/ingest')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(202);
      expect(res.body.runId).toEqual(expect.any(String));

      const summary = await waitForRun(harness.summary, res.body.runId);
      expect(summary).toMatchObject({
        state: 'finished',
        counts: {
          fetched: 2,
          unchanged: 0,
          extracted: 2,
          inactive: 0,
          failed: 0,
          needs_js: 0,
        },
        sources: [
          { url: GIRLS, result: 'ok' },
          { url: BOYS, result: 'ok' },
        ],
      });
      expect(await eligibleFor(GIRL_IN_CLASS_10)).toEqual([
        expect.objectContaining({ name: 'Example Girls Merit Scholarship' }),
      ]);
    });

    it('refuses a second trigger with 409 and the current run ID while a run is in progress', async () => {
      const release = harness.hold(BOYS);
      const first = await harness
        .http()
        .post('/api/admin/ingest')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(202);
      const runId = first.body.runId as string;

      const second = await harness
        .http()
        .post('/api/admin/ingest')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(409);
      expect(second.body.runId).toBe(runId);
      expect(await harness.summary(runId)).toMatchObject({ state: 'running' });

      release();
      expect(await waitForRun(harness.summary, runId)).toMatchObject({
        state: 'finished',
      });
      const next = await harness.ingest();
      expect(next.runId).not.toBe(runId);
    });

    it('resumes a run cut off by the host stopping on the next trigger', async () => {
      harness.hold(BOYS); // never released: the host stops mid-fetch
      const res = await harness
        .http()
        .post('/api/admin/ingest')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(202);
      const cutOff = res.body.runId as string;
      await waitForRun(harness.summary, cutOff, (s) => s.sources.length === 1);

      await harness.restart();
      expect(await harness.summary(cutOff)).toMatchObject({
        state: 'interrupted',
        sources: [{ url: GIRLS, result: 'ok' }],
      });
      harness.serve(BOYS, 'lifecycle/boys-class-12.html');
      const resumed = await harness.ingest();
      expect(resumed).toMatchObject({
        state: 'finished',
        counts: { unchanged: 1, extracted: 1 },
        sources: [
          { url: GIRLS, result: 'unchanged' },
          { url: BOYS, result: 'ok' },
        ],
      });
      expect(await eligibleFor(BOY_IN_CLASS_12)).toHaveLength(1);
    });

    it('returns 404 for an unknown run ID', async () => {
      await harness
        .http()
        .get('/api/admin/ingest/000000000000000000000000')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(404);
      await harness
        .http()
        .get('/api/admin/ingest/not-an-id')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(404);
    });

    it('requires the admin token to read a summary', async () => {
      await harness.http().get('/api/admin/ingest/not-an-id').expect(401);
    });
  });

  describe('a rerun after a first run', () => {
    beforeEach(async () => {
      harness = await startApp({
        fixtures: {
          [GIRLS]: 'lifecycle/girls-class-10.html',
          [BOYS]: 'lifecycle/boys-class-12.html',
        },
        watchlist: WATCHLIST,
        now: DAY_1,
      });
      await harness.ingest();
      harness.setNow(DAY_2);
    });

    it('skips unchanged sources, updating only their last verified date', async () => {
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 2, unchanged: 2, extracted: 0 },
        sources: [
          { url: GIRLS, result: 'unchanged' },
          { url: BOYS, result: 'unchanged' },
        ],
      });
      expect(await eligibleFor(GIRL_IN_CLASS_10)).toEqual([
        expect.objectContaining({
          name: 'Example Girls Merit Scholarship',
          lastVerified: DAY_2.toISOString(),
        }),
      ]);
    });

    it('re-extracts a source whose content changed', async () => {
      harness.serve(GIRLS, 'lifecycle/girls-class-11.html');
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 2, unchanged: 1, extracted: 1 },
        sources: [
          { url: GIRLS, result: 'ok' },
          { url: BOYS, result: 'unchanged' },
        ],
      });
      expect(await eligibleFor(GIRL_IN_CLASS_10)).toEqual([]);
      expect(await eligibleFor({ gender: 'female', class: 11 })).toEqual([
        expect.objectContaining({ name: 'Example Girls Merit Scholarship' }),
      ]);
    });

    it.each([404, 410])(
      'marks the Scholarships of a source answering %i inactive',
      async (status) => {
        harness.serve(GIRLS, { status });
        const summary = await harness.ingest();
        expect(summary).toMatchObject({
          counts: { fetched: 1, unchanged: 1, inactive: 1, failed: 0 },
          sources: [
            { url: GIRLS, result: 'not_found' },
            { url: BOYS, result: 'unchanged' },
          ],
        });
        expect(await eligibleFor(GIRL_IN_CLASS_10)).toEqual([]);
        expect(await eligibleFor(BOY_IN_CLASS_12)).toHaveLength(1);
      },
    );

    it('lists a Scholarship again when its source comes back unchanged', async () => {
      harness.serve(GIRLS, { status: 404 });
      await harness.ingest();
      harness.serve(GIRLS, 'lifecycle/girls-class-10.html');

      const summary = await harness.ingest();
      expect(summary.sources[0]).toEqual({ url: GIRLS, result: 'unchanged' });
      expect(await eligibleFor(GIRL_IN_CLASS_10)).toHaveLength(1);
    });

    it.each<[string, Served, string]>([
      ['a 5xx response', { status: 503 }, 'server_error'],
      ['a network error', { networkError: true }, 'network_error'],
    ])(
      'leaves Scholarships untouched on %s and reports it failed',
      async (_, served, detail) => {
        harness.serve(GIRLS, served);
        const summary = await harness.ingest();
        expect(summary).toMatchObject({
          counts: { fetched: 1, unchanged: 1, inactive: 0, failed: 1 },
          sources: [
            { url: GIRLS, result: 'failed', detail },
            { url: BOYS, result: 'unchanged' },
          ],
        });
        expect(await eligibleFor(GIRL_IN_CLASS_10)).toEqual([
          expect.objectContaining({ lastVerified: DAY_1.toISOString() }),
        ]);
      },
    );

    it('flags a page with almost no text needs_js and skips extraction', async () => {
      harness.serve(GIRLS, 'lifecycle/js-shell.html');
      const summary = await harness.ingest();
      expect(summary).toMatchObject({
        counts: { fetched: 2, extracted: 0, needs_js: 1, inactive: 0 },
        sources: [
          { url: GIRLS, result: 'needs_js' },
          { url: BOYS, result: 'unchanged' },
        ],
      });
      // What was extracted before stays as it was.
      expect(await eligibleFor(GIRL_IN_CLASS_10)).toEqual([
        expect.objectContaining({ lastVerified: DAY_1.toISOString() }),
      ]);
    });
  });
});
