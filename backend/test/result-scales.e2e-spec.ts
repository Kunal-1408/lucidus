import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

// Results on other Result scales: a page accepting IB points or A-level
// grades as alternatives, and a US page asking for a GPA. Each is ingested
// by the rules alone (the fake LLM finds nothing) and matched through the
// endpoint. Nothing is converted between scales.
const IB_OR_A_LEVEL = 'Example Global Futures Award';
const US_GPA = 'Example Lone Star Merit Award';
const PAGES = {
  [IB_OR_A_LEVEL]: 'scales/ib-or-a-level.html',
  [US_GPA]: 'scales/us-gpa.html',
};
type Name = keyof typeof PAGES;

const urlOf = (name: string) =>
  `https://example.org/${name.toLowerCase().replace(/\s+/g, '-')}`;

const ENTRIES: WatchlistEntry[] = Object.keys(PAGES).map((name) => ({
  url: urlOf(name),
  type: 'html',
  region: 'abroad',
  name,
  provider: 'Example provider',
  scholarshipType: 'corporate',
  officialUrl: urlOf(name),
  holds: 'one',
}));

interface Card {
  name: string;
  missing: { field: string; label: string }[];
  extraRequirements: { text: string; sourceText: string }[];
}
type Bucket = 'eligible' | 'withinReach' | 'tellUsMore';

const ib = (value: number) => ({ scale: 'ib_points', value });
const aLevel = (...value: string[]) => ({ scale: 'a_level', value });
const gpa = (value: number) => ({ scale: 'gpa_4', value });
const percent = (value: number) => ({ scale: 'percentage', value });

describe('Result scales, through the Match endpoint', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: Object.fromEntries(
        Object.entries(PAGES).map(([name, file]) => [urlOf(name), file]),
      ),
      now: new Date('2026-07-20T09:00:00Z'),
      watchlist: ENTRIES,
    });
    const summary = await harness.ingest();
    expect(summary.counts.extracted).toBe(2);
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

  async function placed(
    profile: object,
    name: Name,
  ): Promise<{ bucket: Bucket | 'hidden'; card?: Card }> {
    const buckets = await bucketsFor(profile);
    for (const bucket of ['eligible', 'withinReach', 'tellUsMore'] as const) {
      const card = buckets[bucket].find((c) => c.name === name);
      if (card) return { bucket, card };
    }
    return { bucket: 'hidden' };
  }

  describe('a page accepting IB points or A-level grades', () => {
    it('matches an IB Student on IB points', async () => {
      const profile = { class: 12, board: 'ib', class12Result: ib(38) };
      expect((await placed(profile, IB_OR_A_LEVEL)).bucket).toBe('eligible');
    });

    it('matches an A-level Student on grades', async () => {
      const profile = {
        class: 12,
        board: 'cambridge',
        class12Result: aLevel('A*', 'A', 'A'),
      };
      expect((await placed(profile, IB_OR_A_LEVEL)).bucket).toBe('eligible');
    });

    it('leaves an A-level Student below the grades asked unknown, since the IB alternative is', async () => {
      const { bucket, card } = await placed(
        { class: 12, board: 'cambridge', class12Result: aLevel('A', 'A', 'B') },
        IB_OR_A_LEVEL,
      );
      expect(bucket).toBe('tellUsMore');
      expect(card?.missing).toEqual([
        { field: 'class12Result', label: 'Class 12 result in IB points' },
      ]);
    });

    it('is unknown for a percentage-only Student, naming the results that would settle it', async () => {
      const { bucket, card } = await placed(
        { class: 12, board: 'cbse', class12Result: percent(95) },
        IB_OR_A_LEVEL,
      );
      expect(bucket).toBe('tellUsMore');
      expect(card?.missing).toEqual([
        { field: 'class12Result', label: 'Class 12 result in IB points' },
        { field: 'class12Result', label: 'Class 12 result in A-level grades' },
      ]);
    });

    it('shows its GCSE/IGCSE requirement as an Extra requirement', async () => {
      const { card } = await placed(
        { class: 12, board: 'ib', class12Result: ib(38) },
        IB_OR_A_LEVEL,
      );
      expect(card?.extraRequirements).toContainEqual({
        text: expect.stringContaining('GCSE'),
        sourceText: expect.stringContaining('GCSE or IGCSE passes'),
      });
    });
  });

  describe('a page asking for a GPA', () => {
    it.each<[number, Bucket | 'hidden']>([
      [3.7, 'eligible'],
      [3.2, 'hidden'],
    ])('a GPA of %s', async (value, bucket) => {
      const profile = {
        class: 12,
        board: 'us_high_school',
        class12Result: gpa(value),
      };
      expect((await placed(profile, US_GPA)).bucket).toBe(bucket);
    });

    it('shows its AP scores as an Extra requirement', async () => {
      const { card } = await placed(
        { class: 12, board: 'us_high_school', class12Result: gpa(3.7) },
        US_GPA,
      );
      expect(card?.extraRequirements).toContainEqual({
        text: expect.stringContaining('AP'),
        sourceText: expect.stringContaining('AP exam scores'),
      });
    });
  });

  it.each<[string, object, string]>([
    [
      'IB points over 45',
      { class: 12, class12Result: ib(46) },
      'class12Result.value must be a whole number from 0 to 45',
    ],
    [
      'IB points that are not whole',
      { class: 12, class12Result: ib(36.5) },
      'class12Result.value must be a whole number from 0 to 45',
    ],
    [
      'a GPA over 4',
      { class: 12, class12Result: gpa(4.3) },
      'class12Result.value must be from 0 to 4',
    ],
    [
      'an A-level grade of F*',
      { class: 12, class12Result: aLevel('A', 'F*') },
      'class12Result.value must be A-level grades from A* to E',
    ],
    [
      'a CGPA for the Class 12 result',
      { class: 12, class12Result: { scale: 'cgpa_10', value: 9 } },
      'class12Result.scale must be one of percentage, gpa_4, ib_points, a_level',
    ],
    [
      'a Class 10 result from an IB Student',
      { class: 12, board: 'ib', class10Result: percent(90) },
      'class10Result is not asked for the ib board',
    ],
    [
      'boards upcoming from a US Class 12 Student',
      { class: 12, board: 'us_high_school', boardsUpcoming: true },
      'boardsUpcoming is not asked for the us_high_school board',
    ],
  ])('refuses %s', async (_, profile, reason) => {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(400);
    expect(res.body.message).toEqual([reason]);
  });
});
