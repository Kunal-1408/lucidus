import type { Criterion } from '../src/scholarships/scholarship.schema.js';
import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

const ENGINEERING = 'https://example.org/engineering-girls';
const ENGINEERING_NAME = 'Example Engineering Girls Scholarship';
const ON_PAGE =
  'It is meant for those who plan to pursue engineering after school.';

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

// A stored Criterion as it might sit in live data, written before a field
// was removed or by an older extraction.
const stored = (
  field: string,
  op: Criterion['op'],
  value: unknown,
  sourceText: string,
  confidence: Criterion['confidence'] = 'high',
): Criterion => ({
  field,
  op,
  value,
  changeable: false,
  sourceText,
  confidence,
});

describe('Audit of live data', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startApp({
      fixtures: { [ENGINEERING]: 'llm/engineering-girls.html' },
      watchlist: [ENGINEERING_ENTRY],
      now: new Date('2026-07-20T09:00:00Z'),
      llm: () => ({
        criteria: [
          { field: 'fieldOfStudy', values: ['engineering'], quote: ON_PAGE },
        ],
      }),
    });
  });

  afterEach(() => harness.close());

  async function audit() {
    const res = await harness
      .http()
      .get('/api/admin/audit')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    return res.body as Record<string, unknown>[];
  }

  // Adds Criteria to the stored Scholarship, as old live data holds them.
  async function storeAlso(criteria: Criterion[]) {
    await harness
      .model('Scholarship')
      .updateOne(
        { schemeName: ENGINEERING_NAME },
        { $push: { criteria: { $each: criteria } } },
      );
  }

  it('needs the admin token', async () => {
    await harness.http().get('/api/admin/audit').expect(401);
    await harness
      .http()
      .get('/api/admin/audit')
      .set('x-admin-token', 'wrong')
      .expect(401);
  });

  it('lists nothing for Criteria extraction writes today', async () => {
    await harness.ingest();
    expect(await audit()).toEqual([]);
  });

  it('lists each Criterion no valid Profile could satisfy, with its Scholarship and sentence', async () => {
    await harness.ingest();
    await storeAlso([
      stored('latestMarks', 'gte', 60, 'Minimum 60% marks in the last exam.'),
      stored('homeState', 'in', ['atlantis'], 'Domiciles of Atlantis only.'),
      stored(
        'class12Result',
        'gte',
        { scale: 'stanine', value: 7 },
        'A stanine of 7 in Class 12.',
      ),
      stored(
        'class10Result',
        'gte',
        { scale: 'ib_points', value: 30 },
        'IB points in Class 10.',
      ),
      stored(
        'incomeAmount',
        'lte',
        { currency: 'XYZ', period: 'yearly', value: 1000 },
        'Family income under XYZ 1000.',
      ),
      stored(
        'incomeAmount',
        'lte',
        { currency: 'USD', period: 'weekly', value: 100 },
        'Family income under USD 100 a week.',
      ),
      stored('sat', 'gte', 2400, 'A SAT score of 2400.'),
    ]);

    const scholarship = {
      scholarshipId: expect.any(String),
      scholarshipName: ENGINEERING_NAME,
      sourceUrl: ENGINEERING,
    };
    expect(await audit()).toEqual([
      {
        ...scholarship,
        field: 'latestMarks',
        value: 60,
        sourceText: 'Minimum 60% marks in the last exam.',
        problem: 'unknown field',
      },
      {
        ...scholarship,
        field: 'homeState',
        value: ['atlantis'],
        sourceText: 'Domiciles of Atlantis only.',
        problem: 'value outside the fixed list',
      },
      {
        ...scholarship,
        field: 'class12Result',
        value: { scale: 'stanine', value: 7 },
        sourceText: 'A stanine of 7 in Class 12.',
        problem: 'unsupported Result scale',
      },
      {
        ...scholarship,
        field: 'class10Result',
        value: { scale: 'ib_points', value: 30 },
        sourceText: 'IB points in Class 10.',
        problem: 'unsupported Result scale',
      },
      {
        ...scholarship,
        field: 'incomeAmount',
        value: { currency: 'XYZ', period: 'yearly', value: 1000 },
        sourceText: 'Family income under XYZ 1000.',
        problem: 'unsupported currency',
      },
      {
        ...scholarship,
        field: 'incomeAmount',
        value: { currency: 'USD', period: 'weekly', value: 100 },
        sourceText: 'Family income under USD 100 a week.',
        problem: 'unsupported income period',
      },
      {
        ...scholarship,
        field: 'sat',
        value: 2400,
        sourceText: 'A SAT score of 2400.',
        problem: 'value outside the range',
      },
    ]);
  });

  // A low Criterion holds the LLM's raw values until a reviewer approves it;
  // it is listed when approving could never give it a value a Profile meets.
  it("checks a low Criterion's raw values as approving would read them", async () => {
    await harness.ingest();
    const low = (field: string, op: Criterion['op'], value: string[]) =>
      stored(field, op, value, `Raw ${field}.`, 'low');
    await storeAlso([
      low('fieldOfStudy', 'in', ['engineering']),
      low('class12Result', 'gte', ['36 IB points']),
      low('homeState', 'in', ['atlantis']),
      low('class10Result', 'gte', ['36 IB points']),
    ]);

    expect(await audit()).toEqual([
      expect.objectContaining({
        field: 'homeState',
        value: ['atlantis'],
        problem: 'raw value outside the allowed options',
      }),
      expect.objectContaining({
        field: 'class10Result',
        value: ['36 IB points'],
        problem: 'raw value outside the allowed options',
      }),
    ]);
  });
});
