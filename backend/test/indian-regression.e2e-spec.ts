import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

// Today's results for a handful of Indian Profiles, pinned so that later
// changes to the Profile, the Criteria or the Matcher can show Indian
// Students are unaffected. The Scholarships come from the demo Watchlist
// (backend/data/watchlist.json, seeded as on a fresh deploy) and the
// many-scholarship state page, each ingested from its fixture copy.
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
const STATE_SCHEMES = 'https://education.example.gov.in/schemes';

const SANTOOR = "Santoor Women's Scholarship";
// Pinned as extracted today, misreadings included: "For the SC/ST students,
// this cut off is 32% marks" gives a category Criterion (sc, st), as the
// relaxation filter only knows "cut-off", and the 60% Class 10 marks for
// "continuation of scholarship" is read as a condition to apply.
const NMMSS = 'National Means-cum-Merit Scholarship Scheme';
const AICTE_PRAGATI =
  'AICTE Pragati Scholarship for Girl Students (Technical Degree)';
const LIC_GENERAL = 'General Scholarship';
const LIC_SPECIAL = 'Special Scholarship';
const STATE_PRAGATI = 'Pragati Scholarship for Girls';
const STATE_MERIT = 'Merit Scholarship for Class 9';
const STATE_SCIENCE = 'Science Talent Award';
// Was in the Review report, hidden, until ticket 07 read it as an award for
// international students: with no destination given, each of these Profiles
// is asked where they want to study. No Indian scheme's bucket changed.
// Since the Wave 2 review it also holds the country it names (Canada), and
// home or international is read only beside that destination; with no
// destination given both stay unknown, so it stays in Tell us more.
const PEARSON = 'Lester B. Pearson International Scholarship';

const NEXT_CLASS = 'Eligible from next year: watch for the next round';

interface Card {
  name: string;
  goals: string[];
}

// Each bucket's cards by name, with a Within reach card's Goals.
interface Buckets {
  eligible: string[];
  withinReach: Record<string, string[]>;
  tellUsMore: string[];
}

describe('Indian Profiles keep their results', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: { ...DEMO_FIXTURES, [STATE_SCHEMES]: 'many/schemes-v1.html' },
      now: new Date('2026-09-01T09:00:00Z'),
    });
    await harness
      .http()
      .post('/api/admin/watchlist')
      .set('x-admin-token', ADMIN_TOKEN)
      .send({
        url: STATE_SCHEMES,
        type: 'html',
        region: 'india',
        name: 'Example State scholarship schemes',
        provider: 'Example State Education Department',
        scholarshipType: 'government',
        officialUrl: 'https://scholarships.example.gov.in',
        holds: 'many',
        split: { splitSelector: 'h2' },
      })
      .expect(201);
    await harness.ingest();
    // Six sources ingested on a fresh app: under full-suite load this can
    // outlast the default hook timeout, closing the client mid-setup.
  }, 300_000);

  afterAll(() => harness.close());

  async function bucketsFor(profile: object): Promise<Buckets> {
    const res = await harness
      .http()
      .post('/api/match')
      .send(profile)
      .expect(200);
    const body = res.body as Record<keyof Buckets, Card[]>;
    const names = (cards: Card[]) => cards.map((card) => card.name).sort();
    return {
      eligible: names(body.eligible),
      withinReach: Object.fromEntries(
        body.withinReach.map((card) => [card.name, card.goals]),
      ),
      tellUsMore: names(body.tellUsMore),
    };
  }

  // Each Profile goes in both shapes: the old one, with a domicile and a
  // school state, and the one the form sends now, with India and the
  // state's ISO region (the school state falling back to that Home state).
  // Both must land in the same buckets.
  async function expectBuckets(
    profile: object,
    home: { state: string; region: string },
    expected: Buckets,
  ) {
    const old = { domicileState: home.state, schoolState: home.state };
    expect(await bucketsFor({ ...profile, ...old })).toEqual(expected);
    const now = {
      countryOfResidence: 'IN',
      region: home.region,
      schoolState: home.state,
    };
    expect(await bucketsFor({ ...profile, ...now })).toEqual(expected);
  }

  it('a Class 12 girl in Kerala with 85% and income of ₹2–2.5 lakh', async () => {
    await expectBuckets(
      {
        class: 12,
        gender: 'female',
        // Was latestMarks: 85, which Board marks replace; for a Class 12
        // Student their latest marks are the Class 12 result.
        class12Result: { scale: 'percentage', value: 85 },
        incomeBand: '2l_2_5l',
      },
      { state: 'kerala', region: 'IN-KL' },
      {
        // The state page says "Class 12 with Science", which names no stream.
        eligible: [AICTE_PRAGATI, LIC_GENERAL, SANTOOR, STATE_SCIENCE],
        withinReach: {},
        tellUsMore: [PEARSON, NMMSS],
      },
    );
  });

  it('a Class 10 SC girl in Bihar with income under ₹1 lakh', async () => {
    await expectBuckets(
      {
        class: 10,
        gender: 'female',
        category: 'sc',
        incomeBand: 'under_1l',
      },
      { state: 'bihar', region: 'IN-BR' },
      {
        eligible: [AICTE_PRAGATI],
        withinReach: { [STATE_PRAGATI]: [NEXT_CLASS] },
        tellUsMore: [PEARSON, NMMSS, LIC_SPECIAL],
      },
    );
  });

  it('a Class 9 OBC boy at a government school in Tamil Nadu with income of ₹1–2 lakh', async () => {
    await expectBuckets(
      {
        class: 9,
        schoolType: 'government',
        gender: 'male',
        category: 'obc',
        incomeBand: '1l_2l',
      },
      { state: 'tamil_nadu', region: 'IN-TN' },
      {
        eligible: [STATE_MERIT],
        withinReach: { [LIC_SPECIAL]: [NEXT_CLASS] },
        tellUsMore: [PEARSON],
      },
    );
  });

  it('a Class 11 science boy at a private school in Maharashtra with income over ₹8 lakh', async () => {
    await expectBuckets(
      {
        class: 11,
        schoolType: 'private',
        board: 'cbse',
        gender: 'male',
        category: 'general',
        incomeBand: 'over_8l',
        // Was latestMarks: 92 with boardsUpcoming: true. Board marks replace
        // latest marks, and a Class 11 Student's last board exam is Class 10;
        // boards upcoming is no longer asked in Class 11.
        class10Result: { scale: 'percentage', value: 92 },
        stream: 'science',
      },
      { state: 'maharashtra', region: 'IN-MH' },
      {
        eligible: [],
        withinReach: { [STATE_SCIENCE]: [NEXT_CLASS] },
        tellUsMore: [PEARSON],
      },
    );
  });

  it('a Class 10 ST girl at an aided school in Odisha with boards upcoming', async () => {
    await expectBuckets(
      {
        class: 10,
        schoolType: 'aided',
        gender: 'female',
        category: 'st',
        incomeBand: 'under_1l',
        // Was class10Marks: 57. A Class 10 Student whose boards are upcoming
        // has no Class 10 result yet, so Board marks don't ask for one.
        boardsUpcoming: true,
      },
      { state: 'odisha', region: 'IN-OD' },
      {
        eligible: [AICTE_PRAGATI],
        // Moved from Within reach ("Score 60% in Class 10 to unlock this") when
        // class10Marks was replaced: with no Class 10 result to judge, the 60%
        // Class 10 Criteria are unknown.
        withinReach: {},
        tellUsMore: [PEARSON, NMMSS, LIC_SPECIAL],
      },
    );
  });
});
