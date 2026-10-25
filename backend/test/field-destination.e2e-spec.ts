import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

// One fixture page each for a home-student award, an international-student
// award and a Field of study group. Each is ingested by the rules alone (the
// fake LLM finds nothing) and matched through the endpoint.
const PAGES = {
  'Example UK Home Student Award': 'study/uk-home-students.html',
  'Example US International Award': 'study/us-international-students.html',
  'Example Engineering and Computing Scholarship':
    'study/engineering-computing.html',
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

type Bucket = 'eligible' | 'withinReach' | 'tellUsMore' | 'hidden';

describe('Field of study group and destination, through the Match endpoint', () => {
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
    expect(summary.counts.extracted).toBe(3);
  });

  afterAll(() => harness.close());

  async function bucketOf(profile: object, name: Name): Promise<Bucket> {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    for (const bucket of ['eligible', 'withinReach', 'tellUsMore'] as const) {
      const names = (res.body[bucket] as { name: string }[]).map((c) => c.name);
      if (names.includes(name)) return bucket;
    }
    return 'hidden';
  }

  it.each<[string, object, Bucket]>([
    [
      'a Student in the UK who wants to study there',
      { countryOfResidence: 'GB', destination: 'GB' },
      'eligible',
    ],
    [
      'a Student in India who wants to study in the UK',
      { countryOfResidence: 'IN', destination: 'GB' },
      'hidden',
    ],
    [
      'a Student in the UK who wants to study in the US',
      { countryOfResidence: 'GB', destination: 'US' },
      'hidden',
    ],
    [
      'a Student who wants to study in the UK and gave no country',
      { destination: 'GB' },
      'tellUsMore',
    ],
  ])('home students: %s', async (_, profile, bucket) => {
    expect(await bucketOf(profile, 'Example UK Home Student Award')).toBe(
      bucket,
    );
  });

  it.each<[string, object, Bucket]>([
    [
      'a Student in India who wants to study in the US',
      { countryOfResidence: 'IN', destination: 'US' },
      'eligible',
    ],
    [
      'a Student in the US who wants to study there',
      { countryOfResidence: 'US', destination: 'US' },
      'hidden',
    ],
    [
      'a Student in India who wants to study in India',
      { countryOfResidence: 'IN', destination: 'IN' },
      'hidden',
    ],
    [
      'a Student who gave no destination',
      { countryOfResidence: 'IN' },
      'tellUsMore',
    ],
  ])('international students: %s', async (_, profile, bucket) => {
    expect(await bucketOf(profile, 'Example US International Award')).toBe(
      bucket,
    );
  });

  it.each<[string, object, Bucket]>([
    ['Engineering', { class: 12, fieldOfStudy: 'engineering' }, 'eligible'],
    ['Computing', { class: 12, fieldOfStudy: 'computing' }, 'eligible'],
    ['Law', { class: 12, fieldOfStudy: 'law' }, 'hidden'],
    ['Other', { class: 12, fieldOfStudy: 'other' }, 'hidden'],
    ['no Field of study group', { class: 12 }, 'tellUsMore'],
  ])('a Field of study group: %s', async (_, profile, bucket) => {
    expect(
      await bucketOf(profile, 'Example Engineering and Computing Scholarship'),
    ).toBe(bucket);
  });

  it('names what would settle a home-student award', async () => {
    const res = await harness
      .http()
      .post('/api/match')
      .send({ destination: 'GB' })
      .expect(200);
    const card = (
      res.body.tellUsMore as { name: string; missing: unknown[] }[]
    ).find((c) => c.name === 'Example UK Home Student Award');
    expect(card?.missing).toEqual([
      {
        field: 'destinationIsResidence',
        label: 'the country you live in and where you want to study',
      },
    ]);
  });

  it.each([
    [
      { destination: 'uk' },
      'destination must be an ISO 3166-1 alpha-2 country code',
    ],
    [
      { destination: 'XX' },
      'destination must be an ISO 3166-1 alpha-2 country code',
    ],
    [{ fieldOfStudy: 'rocketry' }, 'fieldOfStudy must be one of'],
  ])('rejects %j', async (profile, reason) => {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(400);
    expect(JSON.stringify(res.body)).toContain(reason);
  });
});
