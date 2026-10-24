import { Harness, startApp } from './harness.js';

// Board marks: Scholarships asking for a Class 10 or Class 12 percentage are
// judged on that result, and marks for any other year are shown as Extra
// requirements, never matched.
const MERIT_SCHEMES = 'https://merit.example.gov.in/schemes';
const NMMSS_URL =
  'https://www.myscheme.gov.in/api/apisetu/schemes?slug=nmmss&lang=en';

const SANTOOR_STYLE = 'Santoor-style Scholarship for Girls';
const CENTRAL_SECTOR_STYLE = 'Central Sector-style Merit Scholarship';
const ISHAN_UDAY_STYLE = 'Ishan Uday-style Class 11 Scholarship';
const NMMSS = 'National Means-cum-Merit Scholarship Scheme';

const percent = (value: number) => ({ scale: 'percentage', value });

interface Card {
  name: string;
  goals: string[];
  missing: { field: string; label: string }[];
  extraRequirements: { text: string; sourceText: string }[];
}

type Bucket = 'eligible' | 'withinReach' | 'tellUsMore';

describe('Board marks', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: {
        [MERIT_SCHEMES]: 'marks/board-marks.html',
        [NMMSS_URL]: 'demo/myscheme-nmmss.json',
      },
      now: new Date('2026-09-01T09:00:00Z'),
      watchlist: [
        {
          url: MERIT_SCHEMES,
          type: 'html',
          region: 'india',
          name: 'Merit scholarship schemes',
          provider: 'Example Merit Board',
          scholarshipType: 'government',
          officialUrl: MERIT_SCHEMES,
          holds: 'many',
          split: { splitSelector: 'h2' },
        },
        {
          url: NMMSS_URL,
          type: 'json',
          region: 'india',
          name: NMMSS,
          provider: 'Ministry of Education',
          scholarshipType: 'government',
          officialUrl: 'https://www.myscheme.gov.in/schemes/nmmss',
          holds: 'one',
        },
      ],
    });
    const summary = await harness.ingest();
    expect(summary.counts.extracted).toBe(4);
  });

  afterAll(() => harness.close());

  async function bucketsFor(profile: object): Promise<Record<Bucket, Card[]>> {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    return res.body as Record<Bucket, Card[]>;
  }

  const names = (cards: Card[]) => cards.map((card) => card.name).sort();

  it('judges a Class 12 Student on the Class 12 result', async () => {
    const buckets = await bucketsFor({
      class: 12,
      gender: 'female',
      class10Result: percent(70),
      class12Result: percent(75),
    });
    // 75% passes the 60% Class 12 threshold and fails the 80% one.
    expect(names(buckets.eligible)).toEqual([SANTOOR_STYLE]);
    expect(
      names([...buckets.withinReach, ...buckets.tellUsMore]),
    ).not.toContain(CENTRAL_SECTOR_STYLE);
  });

  it('judges a Class 11 Student on the Class 10 result', async () => {
    const pass = await bucketsFor({ class: 11, class10Result: percent(80) });
    expect(names(pass.eligible)).toContain(ISHAN_UDAY_STYLE);
    const fail = await bucketsFor({ class: 11, class10Result: percent(70) });
    expect(
      names([...fail.eligible, ...fail.withinReach, ...fail.tellUsMore]),
    ).not.toContain(ISHAN_UDAY_STYLE);
  });

  it('asks a Student who gave no result for the result that would settle it', async () => {
    const { tellUsMore } = await bucketsFor({ class: 12, gender: 'female' });
    const card = tellUsMore.find((c) => c.name === CENTRAL_SECTOR_STYLE);
    expect(card?.missing).toEqual([
      { field: 'class12Result', label: 'Class 12 result' },
    ]);
  });

  it('gives a Class 12 Student with boards upcoming a Goal on the expected result', async () => {
    const { withinReach } = await bucketsFor({
      class: 12,
      boardsUpcoming: true,
      class12Result: percent(76),
    });
    expect(withinReach).toEqual([
      expect.objectContaining({
        name: CENTRAL_SECTOR_STYLE,
        goals: ['Score 80% in Class 12 to unlock this'],
      }),
    ]);
  });

  it("shows NMMS's Class 8 marks rule as an Extra requirement", async () => {
    const { tellUsMore } = await bucketsFor({ class: 9 });
    const nmmss = tellUsMore.find((card) => card.name === NMMSS);
    expect(nmmss?.extraRequirements).toContainEqual({
      text: 'At least 55% marks in Class 8',
      sourceText: expect.stringContaining('Class 8th examination'),
    });
  });

  it('refuses a percentage over 100', async () => {
    const res = await harness
      .http()
      .post('/api/match')
      .send({ class: 12, class12Result: percent(105) })
      .expect(400);
    expect(res.body.message).toEqual([
      'class12Result.value must be from 0 to 100',
    ]);
  });
});
