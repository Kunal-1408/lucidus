import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

// One fixture page per new Criterion: residents of a country, permanent
// residents, OCI card holders and a Home state. Each is ingested by the
// rules alone (the fake LLM finds nothing) and matched through the endpoint.
const PAGES = {
  'Example Emirates School Award': 'abroad/uae-residents.html',
  'Example Singapore Merit Award': 'abroad/singapore-permanent-residents.html',
  'Example Diaspora Scholarship': 'abroad/oci-holders.html',
  'Example Kerala Students Scholarship': 'abroad/kerala-home-state.html',
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

describe('Where the Student lives and their Citizenship, through the Match endpoint', () => {
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
    expect(summary.counts.extracted).toBe(4);
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
    ['a Student living in the UAE', { countryOfResidence: 'AE' }, 'eligible'],
    ['a Student living in India', { countryOfResidence: 'IN' }, 'hidden'],
    ['a Student who gave no country', {}, 'tellUsMore'],
  ])('residents of a country: %s', async (_, profile, bucket) => {
    expect(await bucketOf(profile, 'Example Emirates School Award')).toBe(
      bucket,
    );
  });

  it.each<[string, object, Bucket]>([
    [
      'a permanent resident of Singapore',
      { countryOfResidence: 'SG', residenceStatus: 'permanent_resident' },
      'eligible',
    ],
    [
      'a Student in Singapore on a visa',
      { countryOfResidence: 'SG', residenceStatus: 'visa' },
      'hidden',
    ],
    [
      'a Student in Singapore who gave no Residence status',
      { countryOfResidence: 'SG' },
      'tellUsMore',
    ],
  ])('permanent residents: %s', async (_, profile, bucket) => {
    expect(await bucketOf(profile, 'Example Singapore Merit Award')).toBe(
      bucket,
    );
  });

  it.each<[string, object, Bucket]>([
    ['an OCI card holder', { citizenship: 'oci' }, 'eligible'],
    ['an Indian citizen', { citizenship: 'indian' }, 'hidden'],
    ['a Student who gave no Citizenship', {}, 'tellUsMore'],
  ])('OCI card holders: %s', async (_, profile, bucket) => {
    expect(await bucketOf(profile, 'Example Diaspora Scholarship')).toBe(
      bucket,
    );
  });

  it.each<[string, object, Bucket]>([
    [
      'a Student living in Kerala',
      { countryOfResidence: 'IN', region: 'IN-KL' },
      'eligible',
    ],
    [
      'a Student in Dubai whose Home state is Kerala',
      { countryOfResidence: 'AE', region: 'AE-DU', homeState: 'kerala' },
      'eligible',
    ],
    [
      'a Student living in Goa',
      { countryOfResidence: 'IN', region: 'IN-GA' },
      'hidden',
    ],
    [
      'a Student abroad with no Home state',
      { countryOfResidence: 'AE' },
      'tellUsMore',
    ],
    [
      'an old Profile with a domicile state',
      { domicileState: 'kerala' },
      'eligible',
    ],
  ])('a Home state: %s', async (_, profile, bucket) => {
    expect(await bucketOf(profile, 'Example Kerala Students Scholarship')).toBe(
      bucket,
    );
  });
});
