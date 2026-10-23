import { Harness, startApp } from './harness.js';

const SANTOOR = 'https://www.santoorscholarships.com/';

describe('Seed → ingest → match', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: { [SANTOOR]: 'santoor-scholarship.html' },
      now: new Date('2026-07-20T09:00:00Z'),
    });
  });

  afterAll(() => harness.close());

  it('reports the deployed commit on the health check', async () => {
    process.env.RENDER_GIT_COMMIT = 'abc1234';
    try {
      const res = await harness.http().get('/api/health').expect(200);
      expect(res.body).toEqual({ ok: true, commit: 'abc1234' });
    } finally {
      delete process.env.RENDER_GIT_COMMIT;
    }
  });

  it('rejects ingestion with a missing or wrong admin token', async () => {
    await harness.http().post('/api/admin/ingest').expect(401);
    await harness
      .http()
      .post('/api/admin/ingest')
      .set('x-admin-token', 'wrong')
      .expect(401);
  });

  it('ingests the seeded Watchlist entry', async () => {
    const summary = await harness.ingest();
    expect(summary.sources).toEqual([{ url: SANTOOR, result: 'ok' }]);
  });

  it('matches a Profile whose gender and class pass as Eligible', async () => {
    const res = await harness
      .http()
      .post('/api/match')
      .send({ gender: 'female', class: 12 })
      .expect(200);
    expect(res.body.eligible).toEqual([
      expect.objectContaining({
        name: "Santoor Women's Scholarship",
        amountText: 'Rs. 30,000 per annum',
        officialUrl: SANTOOR,
        lastVerified: '2026-07-20T09:00:00.000Z',
        deadline: '2026-10-15',
        deadlineStatus: 'open',
      }),
    ]);
  });

  it('shows a Class 11 Student the Class 12 scholarship as a next-class card', async () => {
    const res = await harness
      .http()
      .post('/api/match')
      .send({ gender: 'female', class: 11 })
      .expect(200);
    expect(res.body.withinReach).toEqual([
      expect.objectContaining({
        name: "Santoor Women's Scholarship",
        goals: ['Eligible from next year: watch for the next round'],
        deadlineStatus: 'open',
      }),
    ]);
  });

  it.each([
    ['gender', { gender: 'male', class: 12 }],
    ['class', { gender: 'female', class: 11 }],
  ])('does not match a Profile that fails on %s', async (_, profile) => {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    expect(res.body.eligible).toEqual([]);
  });
});
