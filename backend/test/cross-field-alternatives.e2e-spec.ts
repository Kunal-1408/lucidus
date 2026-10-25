import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

// Alternatives across fields: a page accepting a Class 12 result on several
// Result scales or a SAT score, read by the rules alone, and a page the rules
// leave ungrouped (a GPA, and a SAT score "in its place") that a reviewer
// groups through an Override. Each is matched through the endpoint.
const A_LEVEL_IB_OR_SAT = 'Example Transatlantic Award';
const GPA_OR_SAT = 'Example Prairie Merit Award';
const PAGES = {
  [A_LEVEL_IB_OR_SAT]: 'scales/a-level-ib-or-sat.html',
  [GPA_OR_SAT]: 'scales/gpa-or-sat.html',
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
  scholarshipType: 'foundation',
  officialUrl: urlOf(name),
  holds: 'one',
}));

interface Card {
  name: string;
  missing: { field: string; label: string }[];
}
type Bucket = 'eligible' | 'withinReach' | 'tellUsMore';

const ib = (value: number) => ({ scale: 'ib_points', value });
const aLevel = (...value: string[]) => ({ scale: 'a_level', value });
const gpa = (value: number) => ({ scale: 'gpa_4', value });

const A_LEVEL_STUDENT = {
  class: 12,
  board: 'cambridge',
  class12Result: aLevel('A', 'A', 'A'),
};
const IB_STUDENT = { class: 12, board: 'ib', class12Result: ib(40) };
const SAT_STUDENT = { class: 12, board: 'us_high_school', sat: 1500 };

describe('Alternatives across fields, through the Match endpoint', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startApp({
      fixtures: Object.fromEntries(
        Object.entries(PAGES).map(([name, file]) => [urlOf(name), file]),
      ),
      now: new Date('2026-07-20T09:00:00Z'),
      watchlist: ENTRIES,
      overridesFile: 'overrides/empty.json',
    });
    const summary = await harness.ingest();
    expect(summary.counts.extracted).toBe(2);
  });

  afterEach(() => harness.close());

  async function placed(
    profile: object,
    name: Name,
  ): Promise<{ bucket: Bucket | 'hidden'; card?: Card }> {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    const buckets = res.body as Record<Bucket, Card[]>;
    for (const bucket of ['eligible', 'withinReach', 'tellUsMore'] as const) {
      const card = buckets[bucket].find((c) => c.name === name);
      if (card) return { bucket, card };
    }
    return { bucket: 'hidden' };
  }

  const admin = {
    post: (body: object) =>
      harness
        .http()
        .post('/api/admin/overrides')
        .set('x-admin-token', ADMIN_TOKEN)
        .send(body),
    // A Scholarship needing no review is not in the Review report, so its
    // hash is read from the store, as a reviewer would read it off the page.
    hashOf: async (name: Name) => {
      const scholarship = await harness
        .model<{ contentHash: string }>('Scholarship')
        .findOne({ schemeName: name })
        .lean();
      return scholarship!.contentHash;
    },
  };

  const override = (name: Name, contentHash: string) => ({
    sourceUrl: urlOf(name),
    schemeName: name,
    contentHash,
    action: 'approve',
    note: 'Checked the page.',
    reviewedBy: 'Kunal',
  });

  describe('a page accepting "A-levels AAA, IB 39 points, or SAT ≥ 1450"', () => {
    it.each([
      ['an A-level Student', A_LEVEL_STUDENT],
      ['an IB Student', IB_STUDENT],
      ['a SAT Student', SAT_STUDENT],
    ])('is Eligible for %s', async (_, profile) => {
      expect((await placed(profile, A_LEVEL_IB_OR_SAT)).bucket).toBe(
        'eligible',
      );
    });

    it('leaves an IB Student below the points unknown, naming the alternatives left', async () => {
      const below = { class: 12, board: 'ib', class12Result: ib(30) };
      const { bucket, card } = await placed(below, A_LEVEL_IB_OR_SAT);
      expect(bucket).toBe('tellUsMore');
      expect(card?.missing).toEqual([
        { field: 'class12Result', label: 'Class 12 result in A-level grades' },
        { field: 'sat', label: 'SAT score' },
      ]);
    });

    it('leaves a SAT Student below the score unknown, since a Class 12 result may still pass', async () => {
      const below = { ...SAT_STUDENT, sat: 1300 };
      expect((await placed(below, A_LEVEL_IB_OR_SAT)).bucket).toBe(
        'tellUsMore',
      );
    });

    it('asks a Student who gives nothing for every alternative', async () => {
      const { bucket, card } = await placed({ class: 12 }, A_LEVEL_IB_OR_SAT);
      expect(bucket).toBe('tellUsMore');
      expect(card?.missing).toEqual([
        { field: 'class12Result', label: 'Class 12 result' },
        { field: 'sat', label: 'SAT score' },
      ]);
    });

    it('keeps the group when a reviewer approves the extraction', async () => {
      const contentHash = await admin.hashOf(A_LEVEL_IB_OR_SAT);
      await admin.post(override(A_LEVEL_IB_OR_SAT, contentHash)).expect(201);
      await harness.ingest();
      expect((await placed(A_LEVEL_STUDENT, A_LEVEL_IB_OR_SAT)).bucket).toBe(
        'eligible',
      );
    });
  });

  describe('a page the rules leave ungrouped', () => {
    const GPA_SENTENCE = 'Applicants need a minimum GPA of 3.5.';
    const SAT_SENTENCE =
      'Home-schooled applicants may send a SAT score of at least 1400 in its place.';

    it('asks a SAT Student for a GPA until a reviewer groups them', async () => {
      const before = await placed(SAT_STUDENT, GPA_OR_SAT);
      expect(before.bucket).toBe('tellUsMore');

      const contentHash = await admin.hashOf(GPA_OR_SAT);
      await admin
        .post({
          ...override(GPA_OR_SAT, contentHash),
          action: 'replace',
          criteria: [
            {
              field: 'class12Result',
              values: ['3.5 GPA'],
              sourceText: GPA_SENTENCE,
              alternativeGroup: 'entry',
            },
            {
              field: 'sat',
              values: ['1400'],
              sourceText: SAT_SENTENCE,
              alternativeGroup: 'entry',
            },
          ],
        })
        .expect(201);
      await harness.ingest();

      expect((await placed(SAT_STUDENT, GPA_OR_SAT)).bucket).toBe('eligible');
      const gpaStudent = {
        class: 12,
        board: 'us_high_school',
        class12Result: gpa(3.7),
      };
      expect((await placed(gpaStudent, GPA_OR_SAT)).bucket).toBe('eligible');
    });

    it('refuses an Override whose alternatives group is not text', async () => {
      const contentHash = await admin.hashOf(GPA_OR_SAT);
      const res = await admin
        .post({
          ...override(GPA_OR_SAT, contentHash),
          action: 'replace',
          criteria: [
            {
              field: 'sat',
              values: ['1400'],
              sourceText: SAT_SENTENCE,
              alternativeGroup: 7,
            },
          ],
        })
        .expect(400);
      expect(res.body.message).toEqual([
        'criteria[0].alternativeGroup must be a string',
      ]);
    });
  });
});
