import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

// The curated demo Watchlist in backend/data/watchlist.json, seeded as on a
// fresh deploy. Each source type and edge path has a fixture copy of its
// real page; every other seeded source 404s here.
const SANTOOR = 'https://www.santoorscholarships.com/';
// myScheme's scheme page is built by JavaScript; the Watchlist lists the
// JSON endpoint that page calls.
const NMMSS_JSON =
  'https://www.myscheme.gov.in/api/apisetu/schemes?slug=nmmss&lang=en';
const PRAGATI_PDF =
  'https://scholarships.gov.in/public/schemeGuidelines/AICTE/AICTE_2010_G.pdf';
// One PDF holding two Scholarships.
const LIC_PDF =
  'https://licindia.in/documents/d/guest/golden-jubilee-scholarship-scheme-2026';
const PEARSON = 'https://future.utoronto.ca/pearson/about/';

const FIXTURES = {
  [SANTOOR]: 'santoor-scholarship.html',
  [NMMSS_JSON]: 'demo/myscheme-nmmss.json',
  [PRAGATI_PDF]: 'demo/aicte-pragati-degree.pdf',
  [LIC_PDF]: 'demo/lic-golden-jubilee-2026.pdf',
  [PEARSON]: 'demo/utoronto-pearson.html',
};

describe('The demo Watchlist', () => {
  let harness: Harness;

  beforeEach(async () => {
    harness = await startApp({
      fixtures: FIXTURES,
      now: new Date('2026-09-01T09:00:00Z'),
    });
  });

  afterEach(() => harness.close());

  async function watchlist() {
    const res = await harness
      .http()
      .get('/api/admin/watchlist')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    return res.body as ({ id: string; url: string } & Record<
      string,
      unknown
    >)[];
  }

  // Every visible card: an empty Profile leaves no one Ineligible.
  async function visibleCards() {
    const res = await harness.http().post('/api/match').send({}).expect(200);
    const { eligible, withinReach, tellUsMore } = res.body as Record<
      string,
      { name: string; deadlineStatus: string }[]
    >;
    return [...eligible, ...withinReach, ...tellUsMore];
  }

  it('seeds only entries the admin endpoint accepts', async () => {
    const entries = await watchlist();
    expect(entries).toHaveLength(16);
    for (const { id, lastResult: _, ...entry } of entries) {
      await harness
        .http()
        .delete(`/api/admin/watchlist/${id}`)
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(204);
      await harness
        .http()
        .post('/api/admin/watchlist')
        .set('x-admin-token', ADMIN_TOKEN)
        .send(entry)
        .expect(201);
    }
  });

  it('ingests a page, a PDF, a many-scholarship PDF and a JSON endpoint', async () => {
    const summary = await harness.ingest();
    for (const url of Object.keys(FIXTURES)) {
      expect(summary.sources).toContainEqual({ url, result: 'ok' });
    }
    expect(summary.counts.extracted).toBe(6);
    const names = (await visibleCards()).map((card) => card.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Santoor Women's Scholarship",
        'National Means-cum-Merit Scholarship Scheme',
        'AICTE Pragati Scholarship for Girl Students (Technical Degree)',
        'General Scholarship',
        'Special Scholarship',
      ]),
    );
  });

  it('shows a deadline the source does not announce as not announced', async () => {
    await harness.ingest();
    expect(await visibleCards()).toContainEqual(
      expect.objectContaining({
        name: 'National Means-cum-Merit Scholarship Scheme',
        deadlineStatus: 'not_announced',
      }),
    );
  });

  it('sends a page with no Criteria the rules can read to the Review report', async () => {
    await harness.ingest();
    const res = await harness
      .http()
      .get('/api/admin/review')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body).toContainEqual(
      expect.objectContaining({
        name: 'Lester B. Pearson International Scholarship',
      }),
    );
  });

  it('skips every unchanged Scholarship on a second run', async () => {
    await harness.ingest();
    const second = await harness.ingest();
    expect(second.counts).toMatchObject({ unchanged: 6, extracted: 0 });
  });
});
