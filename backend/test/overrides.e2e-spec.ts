import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

const ENGINEERING = 'https://example.org/engineering-girls';
const ENGINEERING_NAME = 'Example Engineering Girls Scholarship';
const DAY_1 = new Date('2026-07-20T09:00:00Z');

const ENGINEERING_ENTRY: WatchlistEntry = {
  url: ENGINEERING,
  type: 'html',
  region: 'india',
  name: ENGINEERING_NAME,
  provider: 'Example Foundation',
  scholarshipType: 'corporate',
  officialUrl: ENGINEERING,
  holds: 'one',
};

// Not on the page, so the LLM's Criterion stays low and the Scholarship
// needs review.
const NOT_ON_PAGE = 'Only engineering aspirants may apply.';
// On the page, so a reviewer may quote it.
const ON_PAGE =
  'It is meant for those who plan to pursue engineering after school.';
const GIRLS_SENTENCE =
  'The scholarship is open to girls studying in Class 12 at a recognised school anywhere in India.';

const HASH = /^[0-9a-f]{64}$/;

describe('Overrides', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startApp({
      fixtures: { [ENGINEERING]: 'llm/engineering-girls.html' },
      watchlist: [ENGINEERING_ENTRY],
      now: DAY_1,
      llm: () => ({
        criteria: [
          {
            field: 'fieldOfStudy',
            values: ['engineering'],
            quote: NOT_ON_PAGE,
          },
        ],
      }),
    });
  });

  afterEach(() => harness.close());

  const admin = {
    post: (body: object) =>
      harness
        .http()
        .post('/api/admin/overrides')
        .set('x-admin-token', ADMIN_TOKEN)
        .send(body),
    list: async () => {
      const res = await harness
        .http()
        .get('/api/admin/overrides')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(200);
      return res.body as Record<string, unknown>[];
    },
    remove: (id: string) =>
      harness
        .http()
        .delete(`/api/admin/overrides/${id}`)
        .set('x-admin-token', ADMIN_TOKEN),
  };

  async function report() {
    const res = await harness
      .http()
      .get('/api/admin/review')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    return res.body as Record<string, unknown>[];
  }

  // The current hash, read from the Review report as the reviewer would.
  async function currentHash(): Promise<string> {
    const entry = (await report()).find((e) => e.name === ENGINEERING_NAME);
    return entry!.contentHash as string;
  }

  const approve = (contentHash: string) => ({
    sourceUrl: ENGINEERING,
    schemeName: ENGINEERING_NAME,
    contentHash,
    action: 'approve',
    note: 'Checked the page: girls in Class 12 aiming for engineering.',
    reviewedBy: 'Kunal',
  });

  const replace = (
    contentHash: string,
    criteria: { field: string; values: string[]; sourceText: string }[],
  ) => ({
    ...approve(contentHash),
    action: 'replace',
    criteria,
    note: 'The page asks for engineering, in its own words.',
  });

  describe('admin endpoints', () => {
    it('need the admin token', async () => {
      await harness.http().get('/api/admin/overrides').expect(401);
      await harness.http().post('/api/admin/overrides').send({}).expect(401);
      await harness
        .http()
        .delete('/api/admin/overrides/abc')
        .set('x-admin-token', 'wrong')
        .expect(401);
    });

    it('add an Override, list it and remove it', async () => {
      await harness.ingest();
      const contentHash = await currentHash();

      const res = await admin.post(approve(contentHash)).expect(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        ...approve(contentHash),
        reviewedAt: DAY_1.toISOString(),
      });
      expect(await admin.list()).toEqual([res.body]);

      await admin.remove(res.body.id as string).expect(204);
      expect(await admin.list()).toEqual([]);
      await admin.remove(res.body.id as string).expect(404);
    });

    it('rejects an Override with every reason', async () => {
      const res = await admin
        .post({
          action: 'replace',
          contentHash: 'nope',
          criteria: [{ field: 'height' }],
        })
        .expect(400);
      expect(res.body.message).toEqual([
        'sourceUrl is required',
        'schemeName is required',
        'contentHash must be a SHA-256 hex digest',
        'note is required',
        'reviewedBy is required',
        'criteria[0].field must be one of ' +
          'class, class10Result, class12Result, class10Marks, latestMarks, ' +
          'incomeBand, incomeAmount, gender, category, ' +
          'minority, disability, singleGirlChild, citizenship, ' +
          'countryOfResidence, region, homeState, residenceStatus, ' +
          'citizenshipCountry, domicileState, schoolState, schoolType, ' +
          'board, stream, ' +
          'fieldOfStudy, destination, parentOccupation, examsQualified',
        'criteria[0].values must be a non-empty list of strings or numbers',
        'criteria[0].sourceText is required',
      ]);
    });

    it('requires Criteria to replace with, and none to approve', async () => {
      await harness.ingest();
      const contentHash = await currentHash();
      const noCriteria = await admin
        .post({ ...approve(contentHash), action: 'replace' })
        .expect(400);
      expect(noCriteria.body.message).toEqual([
        'criteria is required when action is replace',
      ]);
      const extra = await admin
        .post({ ...approve(contentHash), criteria: [] })
        .expect(400);
      expect(extra.body.message).toEqual([
        'criteria is only allowed when action is replace',
      ]);
    });

    it('rejects an Override for a Scholarship that does not exist', async () => {
      const res = await admin.post(approve('a'.repeat(64))).expect(400);
      expect(res.body.message).toEqual([
        `No Scholarship ${ENGINEERING_NAME} from ${ENGINEERING}`,
      ]);
    });

    it('rejects an Override written against a hash that is not the current one', async () => {
      await harness.ingest();
      const res = await admin.post(approve('a'.repeat(64))).expect(400);
      expect(res.body.message).toEqual([
        `contentHash is not the current hash of ${ENGINEERING_NAME} from ${ENGINEERING}`,
      ]);
    });

    it('rejects replacement values outside the fixed lists', async () => {
      await harness.ingest();
      const res = await admin
        .post(
          replace(await currentHash(), [
            { field: 'gender', values: ['female'], sourceText: GIRLS_SENTENCE },
            { field: 'stream', values: ['astronomy'], sourceText: ON_PAGE },
          ]),
        )
        .expect(400);
      expect(res.body.message).toEqual([
        'criteria[1].values must be allowed options for stream',
      ]);
    });

    it('allows one Override per Scholarship', async () => {
      await harness.ingest();
      const contentHash = await currentHash();
      await admin.post(approve(contentHash)).expect(201);
      await admin.post(approve(contentHash)).expect(409);
    });
  });

  // Meets the rules' Criteria on this page and the LLM's field of study.
  async function eligibleFor(profile: object) {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    return (res.body.eligible as { name: string; confidence: string }[]).map(
      ({ name, confidence }) => ({ name, confidence }),
    );
  }
  const ENGINEERING_GIRL = {
    gender: 'female',
    class: 12,
    fieldOfStudy: 'engineering',
  };

  async function overrideResult() {
    const [override] = await admin.list();
    return { lastResult: override.lastResult, problems: override.problems };
  }

  describe('approving', () => {
    it('clears the Scholarship on the next run as high confidence', async () => {
      await harness.ingest();
      expect(await eligibleFor(ENGINEERING_GIRL)).toEqual([]);

      await admin.post(approve(await currentHash())).expect(201);
      await harness.ingest();

      expect(await eligibleFor(ENGINEERING_GIRL)).toEqual([
        { name: ENGINEERING_NAME, confidence: 'high' },
      ]);
      expect(await report()).toEqual([]);
      expect(await overrideResult()).toEqual({ lastResult: 'applied' });
    });

    it('applies to the extraction the reviewer saw, without reading the page again', async () => {
      await harness.ingest();
      const calls = harness.llmCalls();
      // Were the page read again, the model would now give another reading.
      harness.serveLlm(() => ({
        criteria: [
          { field: 'fieldOfStudy', values: ['medicine'], quote: NOT_ON_PAGE },
        ],
      }));

      await admin.post(approve(await currentHash())).expect(201);
      const summary = await harness.ingest();

      expect(harness.llmCalls()).toBe(calls);
      expect(summary.counts).toMatchObject({ unchanged: 1, extracted: 0 });
      expect(await eligibleFor(ENGINEERING_GIRL)).toEqual([
        { name: ENGINEERING_NAME, confidence: 'high' },
      ]);
    });

    it('is invalid when a Criterion it would make high has values outside the allowed options', async () => {
      harness.serveLlm(() => ({
        criteria: [
          { field: 'fieldOfStudy', values: ['rocketry'], quote: NOT_ON_PAGE },
        ],
      }));
      await harness.ingest();
      const contentHash = await currentHash();
      const added = await admin.post(approve(contentHash)).expect(201);
      await harness.ingest();

      const problems = ['fieldOfStudy: values outside the allowed options'];
      expect(await eligibleFor(ENGINEERING_GIRL)).toEqual([]);
      expect(await overrideResult()).toEqual({
        lastResult: 'invalid',
        problems,
      });
      expect(await report()).toEqual([
        expect.objectContaining({ reason: 'low confidence' }),
        expect.objectContaining({
          reason: 'invalid override',
          contentHash,
          overrideId: added.body.id as string,
          problems,
        }),
      ]);
    });

    it('keeps holding while the page stays the same', async () => {
      await harness.ingest();
      await admin.post(approve(await currentHash())).expect(201);
      await harness.ingest();
      const calls = harness.llmCalls();

      const summary = await harness.ingest();

      expect(summary.counts.unchanged).toBe(1);
      expect(harness.llmCalls()).toBe(calls);
      expect(await eligibleFor(ENGINEERING_GIRL)).toHaveLength(1);
    });

    it('stops holding once removed', async () => {
      await harness.ingest();
      const added = await admin.post(approve(await currentHash()));
      await harness.ingest();

      const calls = harness.llmCalls();

      await admin.remove(added.body.id as string).expect(204);
      const summary = await harness.ingest();

      expect(harness.llmCalls()).toBe(calls);
      expect(summary.counts).toMatchObject({ unchanged: 1, extracted: 0 });
      expect(await eligibleFor(ENGINEERING_GIRL)).toEqual([]);
      expect(await report()).toEqual([
        expect.objectContaining({ reason: 'low confidence' }),
      ]);
    });
  });

  describe('replacing Criteria', () => {
    it('goes live with the corrected Criteria as high confidence', async () => {
      await harness.ingest();
      await admin
        .post(
          replace(await currentHash(), [
            { field: 'gender', values: ['female'], sourceText: GIRLS_SENTENCE },
            {
              field: 'fieldOfStudy',
              values: ['engineering', 'science'],
              sourceText: ON_PAGE,
            },
          ]),
        )
        .expect(201);
      await harness.ingest();

      // The class Criterion is gone and science is now allowed.
      expect(
        await eligibleFor({ gender: 'female', fieldOfStudy: 'science' }),
      ).toEqual([{ name: ENGINEERING_NAME, confidence: 'high' }]);
      expect(
        await eligibleFor({ gender: 'female', fieldOfStudy: 'medicine' }),
      ).toEqual([]);
      expect(await report()).toEqual([]);
      expect(await overrideResult()).toEqual({ lastResult: 'applied' });
    });

    it('is skipped and reported when a sentence is not on the page', async () => {
      await harness.ingest();
      const contentHash = await currentHash();
      const added = await admin
        .post(
          replace(contentHash, [
            { field: 'gender', values: ['female'], sourceText: GIRLS_SENTENCE },
            {
              field: 'fieldOfStudy',
              values: ['engineering'],
              sourceText: NOT_ON_PAGE,
            },
          ]),
        )
        .expect(201);
      await harness.ingest();

      const problems = ['fieldOfStudy: sentence not in the page text'];
      expect(await eligibleFor(ENGINEERING_GIRL)).toEqual([]);
      expect(await overrideResult()).toEqual({
        lastResult: 'invalid',
        problems,
      });
      expect(await report()).toEqual([
        expect.objectContaining({ reason: 'low confidence' }),
        {
          reason: 'invalid override',
          id: expect.any(String),
          name: ENGINEERING_NAME,
          sourceUrl: ENGINEERING,
          schemeName: ENGINEERING_NAME,
          officialUrl: ENGINEERING,
          contentHash,
          overrideId: added.body.id as string,
          problems,
          note: 'The page asks for engineering, in its own words.',
        },
      ]);
    });
  });

  describe('seeding', () => {
    it('starts empty from the repo file', async () => {
      expect(await admin.list()).toEqual([]);
    });

    it('seeds the valid Overrides from the file when empty, and only then', async () => {
      await harness.close();
      harness = await startApp({
        fixtures: { [ENGINEERING]: 'llm/engineering-girls.html' },
        watchlist: [ENGINEERING_ENTRY],
        now: DAY_1,
        overridesFile: 'overrides/seed.json',
      });
      const seeded = {
        id: expect.any(String),
        sourceUrl: ENGINEERING,
        schemeName: ENGINEERING_NAME,
        contentHash: '0'.repeat(64),
        action: 'approve',
        note: 'Seeded from the repo.',
        reviewedBy: 'Kunal',
        reviewedAt: '2026-07-01T10:30:00.000Z',
      };
      // The second entry lacks required fields, the third its reviewed at.
      expect(await admin.list()).toEqual([seeded]);

      await harness.restart();
      expect(await admin.list()).toEqual([seeded]);
    });
  });

  describe('when the page changes', () => {
    it('records nothing on the Override when the changed page fails to extract', async () => {
      await harness.ingest();
      await admin.post(approve(await currentHash())).expect(201);

      harness.serve(ENGINEERING, 'llm/engineering-girls-edited.html');
      harness.serveLlm(() => new Error('LLM down'));
      const summary = await harness.ingest();

      expect(summary.counts.failed).toBe(1);
      expect(await overrideResult()).toEqual({
        lastResult: undefined,
        problems: undefined,
      });
    });

    it('lapses: is kept, reported as page changed, and the Scholarship is checked again', async () => {
      await harness.ingest();
      const oldHash = await currentHash();
      const added = await admin.post(approve(oldHash)).expect(201);
      await harness.ingest();
      expect(await eligibleFor(ENGINEERING_GIRL)).toHaveLength(1);

      harness.serve(ENGINEERING, 'llm/engineering-girls-edited.html');
      await harness.ingest();

      expect(await eligibleFor(ENGINEERING_GIRL)).toEqual([]);
      const newHash = await currentHash();
      expect(newHash).toMatch(HASH);
      expect(newHash).not.toBe(oldHash);
      expect(await report()).toEqual([
        expect.objectContaining({ reason: 'low confidence' }),
        {
          reason: 'page changed',
          id: expect.any(String),
          name: ENGINEERING_NAME,
          sourceUrl: ENGINEERING,
          schemeName: ENGINEERING_NAME,
          officialUrl: ENGINEERING,
          contentHash: newHash,
          overrideId: added.body.id as string,
          oldHash,
          newHash,
          note: approve(oldHash).note,
        },
      ]);
      expect(await admin.list()).toEqual([
        expect.objectContaining({
          id: added.body.id,
          contentHash: oldHash,
          lastResult: 'page changed',
        }),
      ]);
    });
  });
});
