import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

// The demo Watchlist (backend/data/watchlist.json, seeded as on a fresh
// deploy), each source served from its fixture copy.
const DEMO_FIXTURES = {
  'https://www.santoorscholarships.com/': 'santoor-scholarship.html',
  'https://www.myscheme.gov.in/api/apisetu/schemes?slug=nmmss&lang=en':
    'demo/myscheme-nmmss.json',
  'https://scholarships.gov.in/public/schemeGuidelines/AICTE/AICTE_2010_G.pdf':
    'demo/aicte-pragati-degree.pdf',
  'https://licindia.in/documents/d/guest/golden-jubilee-scholarship-scheme-2026':
    'demo/lic-golden-jubilee-2026.pdf',
  'https://future.utoronto.ca/pearson/about/': 'demo/utoronto-pearson.html',
};

// Criteria an extraction from before the old fields were removed stored,
// on unchanged page text.
const OLD_CRITERIA = [
  {
    field: 'latestMarks',
    op: 'gte',
    value: 60,
    changeable: true,
    sourceText: 'Minimum 60% marks.',
    confidence: 'high',
  },
  {
    field: 'domicileState',
    op: 'in',
    value: ['kerala'],
    changeable: false,
    sourceText: 'Domicile of Kerala.',
    confidence: 'high',
  },
];

describe('Re-ingesting after the old fields were removed', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: DEMO_FIXTURES,
      now: new Date('2026-09-01T09:00:00Z'),
    });
    await harness.ingest();
  }, 300_000);

  afterAll(() => harness.close());

  async function audit() {
    const res = await harness
      .http()
      .get('/api/admin/audit')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    return res.body as unknown[];
  }

  it('re-extracts every stored Scholarship once, onto the new fields only', async () => {
    const scholarships = harness.model('Scholarship');
    const stored = await scholarships.countDocuments({ status: 'active' });
    // As live data stood before this release: same page text, an older
    // extraction holding the removed fields.
    await scholarships.updateMany(
      {},
      {
        $set: { criteria: OLD_CRITERIA, extractedCriteria: OLD_CRITERIA },
        $unset: { extractionVersion: 1 },
      },
    );
    expect(await audit()).toHaveLength(stored * OLD_CRITERIA.length);

    const calls = harness.llmCalls();
    const summary = await harness.ingest();

    expect(summary.counts).toMatchObject({ extracted: stored, unchanged: 0 });
    expect(harness.llmCalls()).toBe(calls + stored);
    expect(await audit()).toEqual([]);

    // Once re-extracted, unchanged text keeps its extraction again.
    const again = await harness.ingest();
    expect(again.counts).toMatchObject({ extracted: 0, unchanged: stored });
  }, 300_000);
});
