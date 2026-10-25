import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

// SPDC as seeded from backend/data/watchlist.json, served from a copy of the
// 2025-26 guidelines PDF, with the repo's Override for that text. The
// scheme is for children of NRIs, PIOs and OCIs who passed Class 11 and 12
// abroad with 60% or more, to study in India.
const SPDC_PDF =
  'https://www.indianembassyalgiers.gov.in/content/Final-SPDC-Guidelines-2025-26.pdf';
const SPDC = 'Scholarship Programme for Diaspora Children (SPDC)';

const percent = (value: number) => ({ scale: 'percentage', value });

describe('SPDC on the Watchlist', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: { [SPDC_PDF]: 'abroad/spdc-guidelines-2025-26.pdf' },
      now: new Date('2026-10-25T09:00:00Z'),
    });
    const summary = await harness.ingest();
    expect(summary.sources).toContainEqual({ url: SPDC_PDF, result: 'ok' });
  });

  afterAll(() => harness.close());

  async function visible(profile: object): Promise<string[]> {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    const { eligible, withinReach, tellUsMore } = res.body as Record<
      string,
      { name: string }[]
    >;
    return [...eligible, ...withinReach, ...tellUsMore].map((c) => c.name);
  }

  it('is seeded as a government scheme for study in India', async () => {
    const res = await harness
      .http()
      .get('/api/admin/watchlist')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body).toContainEqual(
      expect.objectContaining({
        url: SPDC_PDF,
        type: 'pdf',
        region: 'india',
        name: SPDC,
        scholarshipType: 'government',
        holds: 'one',
      }),
    );
  });

  // The rules misread these guidelines; the repo's Override corrects them.
  it("applies the repo's Override written against this text", async () => {
    const res = await harness
      .http()
      .get('/api/admin/overrides')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    expect(res.body).toContainEqual(
      expect.objectContaining({
        sourceUrl: SPDC_PDF,
        schemeName: SPDC,
        lastResult: 'applied',
      }),
    );
  });

  const inClass12 = {
    class: 12,
    class12Result: percent(75),
    destination: 'IN',
  };

  // PIO cards were merged into the OCI card, so a PIO is an OCI card holder.
  it.each([
    ['an OCI card holder (or PIO)', 'oci'],
    ['an NRI', 'indian'],
  ])(
    'shows it to %s in Class 12 in the UAE with 75 percent',
    async (_, citizenship) => {
      expect(
        await visible({ ...inClass12, citizenship, countryOfResidence: 'AE' }),
      ).toContain(SPDC);
    },
  );

  it('hides it from a Student of another nationality with no OCI card', async () => {
    expect(
      await visible({
        ...inClass12,
        citizenship: 'other',
        countryOfResidence: 'AE',
      }),
    ).not.toContain(SPDC);
  });

  it('hides it from a Student abroad below 60 percent', async () => {
    expect(
      await visible({
        ...inClass12,
        citizenship: 'oci',
        countryOfResidence: 'AE',
        class12Result: percent(55),
      }),
    ).not.toContain(SPDC);
  });

  // "Passed grade 11th and 12th from abroad" is about where the Student
  // studied, which no Profile field holds, and "not living in India" needs a
  // negative Criterion (out of scope), so a Student in India is not ruled
  // out: with no destination given, SPDC waits in Tell us more.
  it('leaves it in Tell us more for a Student in India who gives no destination', async () => {
    const res = await harness
      .http()
      .post('/api/match')
      .send({
        class: 12,
        class12Result: percent(75),
        citizenship: 'indian',
        countryOfResidence: 'IN',
      })
      .expect(200);
    const { tellUsMore } = res.body as Record<string, { name: string }[]>;
    expect(tellUsMore.map((c) => c.name)).toContain(SPDC);
  });
});
