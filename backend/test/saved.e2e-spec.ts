import { Scholarship } from '../src/scholarships/scholarship.schema.js';
import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { Harness, startApp } from './harness.js';

const GIRLS = 'https://example.org/girls-merit';
const DAY_1 = new Date('2026-07-20T09:00:00Z');
const DAY_2 = new Date('2026-07-27T09:00:00Z');

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

const VISITOR = 'visitor-aaaa';
const GIRL_IN_CLASS_10 = { gender: 'female', class: 10 };

describe('Saved scholarships', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startApp({
      fixtures: { [GIRLS]: 'lifecycle/girls-class-10.html' },
      watchlist: WATCHLIST,
      now: DAY_1,
    });
    await harness.ingest();
  });

  afterEach(() => harness.close());

  async function firstEligibleId(): Promise<string> {
    const res = await harness
      .http()
      .post('/api/match')
      .send(GIRL_IN_CLASS_10)
      .expect(200);
    return res.body.eligible[0].id as string;
  }

  function save(scholarshipId: string, visitor = VISITOR) {
    return harness
      .http()
      .post('/api/saved')
      .set('x-visitor-id', visitor)
      .send({ scholarshipId });
  }

  async function savedList(visitor = VISITOR) {
    const res = await harness
      .http()
      .get('/api/saved')
      .set('x-visitor-id', visitor)
      .expect(200);
    return res.body as SavedBody[];
  }

  it('shows a saved scholarship that is still listed as a live card', async () => {
    const scholarshipId = await firstEligibleId();
    await save(scholarshipId).expect(201);

    expect(await savedList()).toEqual([
      expect.objectContaining({
        scholarshipId,
        state: 'live',
        card: expect.objectContaining({
          name: 'Example Girls Merit Scholarship',
          provider: 'Example Foundation',
          officialUrl: GIRLS,
          lastVerified: DAY_1.toISOString(),
        }),
      }),
    ]);
  });

  it('shows the live card marked updated when the scholarship changed since it was saved', async () => {
    await save(await firstEligibleId()).expect(201);

    harness.serve(GIRLS, 'lifecycle/girls-class-11.html');
    harness.setNow(DAY_2);
    await harness.ingest();

    expect(await savedList()).toEqual([
      expect.objectContaining({
        state: 'updated',
        card: expect.objectContaining({
          name: 'Example Girls Merit Scholarship',
          lastVerified: DAY_2.toISOString(),
        }),
      }),
    ]);
  });

  it('shows the snapshot taken at save time when the scholarship is no longer listed', async () => {
    const scholarshipId = await firstEligibleId();
    await save(scholarshipId).expect(201);

    harness.serve(GIRLS, { status: 404 });
    harness.setNow(DAY_2);
    await harness.ingest();

    expect(await savedList()).toEqual([
      expect.objectContaining({
        scholarshipId,
        state: 'no_longer_listed',
        card: expect.objectContaining({
          name: 'Example Girls Merit Scholarship',
          lastVerified: DAY_1.toISOString(),
        }),
      }),
    ]);
  });

  it('shows the snapshot taken at save time while the scholarship is being re-checked', async () => {
    const scholarshipId = await firstEligibleId();
    await save(scholarshipId).expect(201);

    harness.serve(GIRLS, 'lifecycle/girls-class-11.html');
    harness.setNow(DAY_2);
    await harness.ingest();
    await harness
      .model<Scholarship>(Scholarship.name)
      .updateOne({ sourceUrl: GIRLS }, { needsReview: true });

    expect(await savedList()).toEqual([
      expect.objectContaining({
        scholarshipId,
        state: 'being_rechecked',
        card: expect.objectContaining({
          name: 'Example Girls Merit Scholarship',
          lastVerified: DAY_1.toISOString(),
        }),
      }),
    ]);
  });

  it('removes a saved scholarship, for its own Visitor only', async () => {
    const res = await save(await firstEligibleId()).expect(201);
    const savedId = res.body.id as string;

    await harness
      .http()
      .delete(`/api/saved/${savedId}`)
      .set('x-visitor-id', 'visitor-bbbb')
      .expect(404);
    expect(await savedList()).toHaveLength(1);

    await harness
      .http()
      .delete(`/api/saved/${savedId}`)
      .set('x-visitor-id', VISITOR)
      .expect(204);
    expect(await savedList()).toEqual([]);
  });

  it("keeps each Visitor's list separate", async () => {
    await save(await firstEligibleId()).expect(201);
    expect(await savedList('visitor-bbbb')).toEqual([]);
  });

  it('saves a scholarship once however many times it is saved', async () => {
    const scholarshipId = await firstEligibleId();
    const first = await save(scholarshipId).expect(201);
    const second = await save(scholarshipId).expect(201);
    expect(second.body.id).toBe(first.body.id);
    expect(await savedList()).toHaveLength(1);
  });

  it('rejects requests without a Visitor ID and saves of unknown scholarships', async () => {
    const scholarshipId = await firstEligibleId();
    await harness.http().get('/api/saved').expect(400);
    await harness.http().post('/api/saved').send({ scholarshipId }).expect(400);
    await save('000000000000000000000000').expect(404);
    await save('not-an-id').expect(404);
  });

  it('rejects saving a scholarship that is no longer listed', async () => {
    const scholarshipId = await firstEligibleId();
    harness.serve(GIRLS, { status: 404 });
    harness.setNow(DAY_2);
    await harness.ingest();

    await save(scholarshipId).expect(404);
    expect(await savedList()).toEqual([]);
  });

  it('rejects saving a scholarship that is being re-checked', async () => {
    const scholarshipId = await firstEligibleId();
    await harness
      .model<Scholarship>(Scholarship.name)
      .updateOne({ sourceUrl: GIRLS }, { needsReview: true });

    await save(scholarshipId).expect(404);
    expect(await savedList()).toEqual([]);
  });
});

interface SavedBody {
  id: string;
  scholarshipId: string;
  savedAt: string;
  state: string;
  card: Record<string, unknown>;
}
