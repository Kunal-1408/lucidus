import type { LlmAnswer } from '../src/ingestion/llm.js';
import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, LlmServed, startApp } from './harness.js';

const URL = 'https://example.org/engineering-girls';
const NAME = 'Example Engineering Girls Scholarship';
const DAY_1 = new Date('2026-07-20T09:00:00Z');

const WATCHLIST: WatchlistEntry[] = [
  {
    url: URL,
    type: 'html',
    region: 'india',
    name: NAME,
    provider: 'Example Foundation',
    scholarshipType: 'corporate',
    officialUrl: URL,
    holds: 'one',
  },
];

const ENGINEERING =
  'It is meant for those who plan to pursue engineering after school.';
const TOP_1 = 'Applicants must rank in the top 1% of their board.';
const TOP_2 = 'Applicants must rank in the top 2% of their board.';
const PAID =
  'Selected students receive full tuition for four years of their degree.';

// The rules find gender and class on this page; the LLM reads the rest.
const READS_PAGE: Partial<LlmAnswer> = {
  criteria: [
    { field: 'fieldOfStudy', values: ['engineering'], quote: ENGINEERING },
  ],
  extraRequirements: [{ text: 'Top 1% in your board', quote: TOP_1 }],
  amountText: { value: 'full tuition for four years', quote: PAID },
};

const reads =
  (answer: Partial<LlmAnswer>): LlmServed =>
  () =>
    answer;
const LLM_DOWN: LlmServed = () => new Error('LLM unavailable');

const GIRL_FOR_ENGINEERING = {
  gender: 'female',
  class: 12,
  fieldOfStudy: 'engineering',
};

interface CardBody {
  name: string;
  amountText: string;
  confidence: string;
  extraRequirements: { text: string; sourceText: string }[];
}

describe('LLM fallback, Confidence and Extra requirements', () => {
  let harness: Harness;

  async function eligible(profile: object = GIRL_FOR_ENGINEERING) {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    return res.body.eligible as CardBody[];
  }

  async function start(llm: LlmServed, page = 'llm/engineering-girls.html') {
    harness = await startApp({
      fixtures: { [URL]: page },
      watchlist: WATCHLIST,
      now: DAY_1,
      llm,
    });
  }

  afterEach(() => harness.close());

  it('shows a Scholarship with a verified LLM value as medium Confidence, with what the LLM found', async () => {
    await start(reads(READS_PAGE));
    await harness.ingest();
    expect(await eligible()).toEqual([
      expect.objectContaining({
        name: NAME,
        confidence: 'medium',
        amountText: 'full tuition for four years',
      }),
    ]);
    // The LLM's Criterion is matched like any other.
    expect(
      await eligible({ ...GIRL_FOR_ENGINEERING, fieldOfStudy: 'law' }),
    ).toEqual([]);
  });

  it('shows Extra requirements on the card with their sentence, never matching them', async () => {
    await start(reads(READS_PAGE));
    await harness.ingest();
    const [card] = await eligible();
    expect(card.extraRequirements).toEqual([
      { text: 'Top 1% in your board', sourceText: TOP_1 },
    ]);
  });

  it('keeps Extra requirements on a Saved card', async () => {
    await start(reads(READS_PAGE));
    await harness.ingest();
    const res = await harness
      .http()
      .post('/api/match')
      .send(GIRL_FOR_ENGINEERING);
    const visitor = { 'x-visitor-id': 'visitor-1' };
    await harness
      .http()
      .post('/api/saved')
      .set(visitor)
      .send({ scholarshipId: res.body.eligible[0].id })
      .expect(201);
    const saved = await harness
      .http()
      .get('/api/saved')
      .set(visitor)
      .expect(200);
    expect(saved.body[0].card).toEqual(
      expect.objectContaining({
        confidence: 'medium',
        extraRequirements: [
          { text: 'Top 1% in your board', sourceText: TOP_1 },
        ],
      }),
    );
  });

  it('keeps a rules-only Scholarship at high Confidence even with no deadline', async () => {
    await start(reads({}));
    await harness.ingest();
    expect(await eligible()).toEqual([
      expect.objectContaining({ confidence: 'high', extraRequirements: [] }),
    ]);
  });

  it('hides a Scholarship whose weakest Criterion is low, setting it needs review', async () => {
    await start(
      reads({
        criteria: [
          {
            field: 'fieldOfStudy',
            values: ['engineering'],
            quote: 'Only engineering aspirants may apply.',
          },
        ],
      }),
    );
    const summary = await harness.ingest();
    expect(summary.counts.extracted).toBe(1);
    expect(await eligible()).toEqual([]);
  });

  it('never calls the LLM at match time', async () => {
    await start(reads(READS_PAGE));
    await harness.ingest();
    const calls = harness.llmCalls();
    expect(calls).toBe(1);
    await eligible();
    await eligible({});
    expect(harness.llmCalls()).toBe(calls);
  });

  describe('when the LLM call fails', () => {
    it('stores nothing for a new Scholarship, reports it, and retries on the next run', async () => {
      await start(LLM_DOWN);
      const failed = await harness.ingest();
      expect(failed.counts).toMatchObject({ extracted: 0, failed: 1 });
      expect(failed.sources).toEqual([
        {
          url: URL,
          result: 'failed',
          detail: expect.stringContaining('LLM unavailable'),
        },
      ]);
      expect(await eligible()).toEqual([]);

      harness.serveLlm(reads(READS_PAGE));
      const retried = await harness.ingest();
      expect(retried.counts).toMatchObject({ extracted: 1, failed: 0 });
      expect(await eligible()).toEqual([
        expect.objectContaining({ name: NAME, confidence: 'medium' }),
      ]);
    });

    it('keeps the previous version of a changed Scholarship, and retries on the next run', async () => {
      await start(reads(READS_PAGE));
      await harness.ingest();
      harness.serve(URL, 'llm/engineering-girls-edited.html');
      harness.serveLlm(LLM_DOWN);

      const failed = await harness.ingest();
      expect(failed.counts).toMatchObject({
        extracted: 0,
        unchanged: 0,
        failed: 1,
      });
      const [kept] = await eligible();
      expect(kept.extraRequirements).toEqual([
        { text: 'Top 1% in your board', sourceText: TOP_1 },
      ]);

      harness.serveLlm(
        reads({
          ...READS_PAGE,
          extraRequirements: [{ text: 'Top 2% in your board', quote: TOP_2 }],
        }),
      );
      const retried = await harness.ingest();
      expect(retried.counts).toMatchObject({ extracted: 1, failed: 0 });
      const [updated] = await eligible();
      expect(updated.extraRequirements).toEqual([
        { text: 'Top 2% in your board', sourceText: TOP_2 },
      ]);
    });

    it('still stores the other Scholarships of a many-scholarship source', async () => {
      const schemes = 'https://education.example.gov.in/schemes';
      const pragati = 'Pragati Scholarship for Girls';
      harness = await startApp({
        fixtures: { [schemes]: 'many/schemes-v1.html' },
        watchlist: [
          {
            url: schemes,
            type: 'html',
            region: 'india',
            name: 'Example State scholarship schemes',
            provider: 'Example State Education Department',
            scholarshipType: 'government',
            officialUrl: schemes,
            holds: 'many',
            split: { splitSelector: 'h2' },
          },
        ],
        now: DAY_1,
        llm: (request) =>
          request.text.includes(pragati) ? new Error('LLM unavailable') : {},
      });

      const failed = await harness.ingest();
      expect(failed.counts).toMatchObject({ extracted: 2, failed: 1 });
      expect(failed.sources).toEqual([
        {
          url: schemes,
          result: 'failed',
          detail: expect.stringContaining(pragati),
        },
      ]);
      // An empty Profile lists every visible Scholarship under Tell us more.
      const res = await harness.http().post('/api/match').send({});
      const listed = res.body.tellUsMore as CardBody[];
      expect(listed.map((c) => c.name).sort()).toEqual([
        'Merit Scholarship for Class 9',
        'Science Talent Award',
      ]);

      harness.serveLlm(reads({}));
      const retried = await harness.ingest();
      expect(retried.counts).toMatchObject({
        extracted: 1,
        unchanged: 2,
        failed: 0,
      });
    });
  });
});
