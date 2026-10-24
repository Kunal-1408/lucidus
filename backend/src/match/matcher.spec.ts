import type { Criterion } from '../scholarships/scholarship.schema.js';
import { match, type MatchableScholarship } from './matcher.js';
import type { Profile } from './profile.js';

const TODAY = '2026-07-20';

let nextId = 0;
function scholarship(
  criteria: Partial<Criterion>[],
  extra: Partial<MatchableScholarship> = {},
): MatchableScholarship {
  nextId += 1;
  return {
    id: `s${nextId}`,
    name: `Scholarship ${nextId}`,
    provider: 'Provider',
    amountText: 'Rs. 10,000',
    officialUrl: 'https://example.org/',
    lastVerified: new Date('2026-07-01T00:00:00Z'),
    confidence: 'high',
    criteria: criteria.map((c) => ({
      field: 'gender',
      op: 'eq',
      value: 'female',
      changeable: false,
      sourceText: 'Some sentence.',
      confidence: 'high',
      ...c,
    })),
    ...extra,
  };
}

function bucketOf(profile: Profile, s: MatchableScholarship, today = TODAY) {
  const r = match(profile, [s], today);
  if (r.eligible.length) return 'eligible';
  if (r.withinReach.length) return 'withinReach';
  if (r.tellUsMore.length) return 'tellUsMore';
  return 'hidden';
}

function cardFor(profile: Profile, s: MatchableScholarship, today = TODAY) {
  const r = match(profile, [s], today);
  const card = [...r.eligible, ...r.withinReach, ...r.tellUsMore][0];
  if (!card) throw new Error('scholarship was hidden');
  return card;
}

describe('Matcher: pass, fail and unknown', () => {
  it('puts a scholarship whose criteria all pass in Eligible', () => {
    expect(bucketOf({ gender: 'female' }, scholarship([{}]))).toBe('eligible');
  });

  it('puts a scholarship with an empty Profile field and no fails in Tell us more', () => {
    expect(bucketOf({}, scholarship([{}]))).toBe('tellUsMore');
  });

  it('lists the missing fields on a Tell us more card', () => {
    const card = cardFor({}, scholarship([{}]));
    expect(card.missing).toEqual([{ field: 'gender', label: 'gender' }]);
  });
});

describe('Matcher: never-changeable fields', () => {
  it.each<[string, Partial<Criterion>, Profile]>([
    ['gender', { field: 'gender', value: 'female' }, { gender: 'male' }],
    [
      'category',
      { field: 'category', op: 'in', value: ['sc', 'st'] },
      { category: 'general' },
    ],
    ['minority', { field: 'minority', value: true }, { minority: false }],
    [
      'citizenship',
      { field: 'citizenship', value: 'indian' },
      { citizenship: 'other' },
    ],
    [
      'domicile',
      { field: 'domicileState', value: 'kerala' },
      { domicileState: 'goa' },
    ],
    [
      'income',
      { field: 'incomeBand', op: 'lte', value: 250000 },
      { incomeBand: '4_5l_6l' },
    ],
  ])(
    'hides a scholarship failing on %s, even if marked changeable',
    (_, c, profile) => {
      expect(bucketOf(profile, scholarship([{ ...c, changeable: true }]))).toBe(
        'hidden',
      );
    },
  );

  it('hides a scholarship with a hard fail even when it also has unknowns', () => {
    const s = scholarship([
      { field: 'gender', value: 'female' },
      { field: 'category', value: 'sc' },
    ]);
    expect(bucketOf({ gender: 'male' }, s)).toBe('hidden');
  });
});

describe('Matcher: income bands against an income threshold', () => {
  const upTo = (value: number) =>
    scholarship([{ field: 'incomeBand', op: 'lte', value }]);
  const atLeast = (value: number) =>
    scholarship([{ field: 'incomeBand', op: 'gte', value }]);

  it.each<[string, Profile['incomeBand'], number, string]>([
    ['band wholly under the limit', '1l_2l', 250000, 'eligible'],
    ['limit on the top edge of the band', '2l_2_5l', 250000, 'eligible'],
    ['limit inside the band', '2_5l_3l', 280000, 'tellUsMore'],
    ['limit on the bottom edge of the band', '2_5l_3l', 250000, 'hidden'],
    ['band wholly over the limit', '6l_8l', 250000, 'hidden'],
    ['lowest band', 'under_1l', 100000, 'eligible'],
    ['open-ended top band', 'over_8l', 800000, 'hidden'],
    ['limit inside the open-ended top band', 'over_8l', 1000000, 'tellUsMore'],
  ])('income up to: %s', (_, band, limit, bucket) => {
    expect(bucketOf({ incomeBand: band }, upTo(limit))).toBe(bucket);
  });

  it.each<[string, Profile['incomeBand'], number, string]>([
    ['band wholly over the minimum', '3l_4_5l', 250000, 'eligible'],
    ['minimum on the bottom edge of the band', '2_5l_3l', 250000, 'eligible'],
    ['minimum inside the band', '2_5l_3l', 280000, 'tellUsMore'],
    ['minimum on the top edge of the band', '2l_2_5l', 250000, 'hidden'],
  ])('income at least: %s', (_, band, limit, bucket) => {
    expect(bucketOf({ incomeBand: band }, atLeast(limit))).toBe(bucket);
  });

  it('matches an income band criterion naming bands directly', () => {
    const s = scholarship([
      { field: 'incomeBand', op: 'in', value: ['under_1l', '1l_2l'] },
    ]);
    expect(bucketOf({ incomeBand: '1l_2l' }, s)).toBe('eligible');
    expect(bucketOf({ incomeBand: '2l_2_5l' }, s)).toBe('hidden');
  });
});

describe('Matcher: list answers and yes/no answers', () => {
  it('passes a list answer that includes a required value', () => {
    const s = scholarship([
      { field: 'examsQualified', op: 'eq', value: 'nmms' },
    ]);
    expect(bucketOf({ examsQualified: ['olympiad', 'nmms'] }, s)).toBe(
      'eligible',
    );
    expect(bucketOf({ examsQualified: ['olympiad'] }, s)).toBe('hidden');
  });

  it('passes a list answer overlapping an allowed list', () => {
    const s = scholarship([
      {
        field: 'parentOccupation',
        op: 'in',
        value: ['defence', 'central_armed_police'],
      },
    ]);
    expect(bucketOf({ parentOccupation: ['defence'] }, s)).toBe('eligible');
  });

  it('treats an empty list answer as unknown', () => {
    const s = scholarship([
      { field: 'examsQualified', op: 'eq', value: 'nmms' },
    ]);
    expect(bucketOf({ examsQualified: [] }, s)).toBe('tellUsMore');
  });

  it('judges a "no" answer, rather than treating it as missing', () => {
    const s = scholarship([{ field: 'disability', value: true }]);
    expect(bucketOf({ disability: false }, s)).toBe('hidden');
  });
});

describe('Matcher: marks', () => {
  const latestAtLeast = (value: number) =>
    scholarship([{ field: 'latestMarks', op: 'gte', value, changeable: true }]);

  it('is Within reach with a Goal when boards are upcoming and the gap is small', () => {
    const profile: Profile = { latestMarks: 76, boardsUpcoming: true };
    const card = cardFor(profile, latestAtLeast(80));
    expect(bucketOf(profile, latestAtLeast(80))).toBe('withinReach');
    expect(card.goals).toEqual(['Score 80% to unlock this']);
  });

  it.each<[string, Profile, number, string]>([
    [
      'gap of exactly 5',
      { latestMarks: 75, boardsUpcoming: true },
      80,
      'withinReach',
    ],
    ['gap of 6', { latestMarks: 74, boardsUpcoming: true }, 80, 'hidden'],
    [
      'boards already taken',
      { latestMarks: 79, boardsUpcoming: false },
      80,
      'hidden',
    ],
    [
      'not known whether boards are upcoming',
      { latestMarks: 79 },
      80,
      'hidden',
    ],
    [
      'target above 100',
      { latestMarks: 97, boardsUpcoming: true },
      101,
      'hidden',
    ],
    [
      'target of exactly 100',
      { latestMarks: 96, boardsUpcoming: true },
      100,
      'withinReach',
    ],
  ])('marks shortfall with %s', (_, profile, target, bucket) => {
    expect(bucketOf(profile, latestAtLeast(target))).toBe(bucket);
  });

  it('treats a marks fail the Criterion says is not changeable as a hard fail', () => {
    const s = scholarship([
      { field: 'latestMarks', op: 'gte', value: 80, changeable: false },
    ]);
    expect(bucketOf({ latestMarks: 78, boardsUpcoming: true }, s)).toBe(
      'hidden',
    );
  });

  it('checks the marks field the Criterion names', () => {
    const profile: Profile = { class10Marks: 70, latestMarks: 90 };
    const onClass10 = scholarship([
      { field: 'class10Marks', op: 'gte', value: 80, changeable: true },
    ]);
    expect(bucketOf(profile, latestAtLeast(80))).toBe('eligible');
    expect(bucketOf(profile, onClass10)).toBe('hidden');
  });

  it('phrases a Class 10 marks Goal for Class 10 marks', () => {
    const s = scholarship([
      { field: 'class10Marks', op: 'gte', value: 80, changeable: true },
    ]);
    const card = cardFor({ class10Marks: 77, boardsUpcoming: true }, s);
    expect(card.goals).toEqual(['Score 80% in Class 10 to unlock this']);
  });

  it('keeps a Within reach card with unknowns Within reach and lists the missing fields', () => {
    const s = scholarship([
      { field: 'latestMarks', op: 'gte', value: 80, changeable: true },
      { field: 'category', value: 'sc' },
    ]);
    const profile: Profile = { latestMarks: 78, boardsUpcoming: true };
    expect(bucketOf(profile, s)).toBe('withinReach');
    expect(cardFor(profile, s).missing).toEqual([
      { field: 'category', label: 'category' },
    ]);
  });

  it('gives Eligible and Tell us more cards no Goals', () => {
    expect(cardFor({ latestMarks: 90 }, latestAtLeast(80)).goals).toEqual([]);
    expect(cardFor({}, latestAtLeast(80)).goals).toEqual([]);
  });
});

describe('Matcher: Board marks', () => {
  const percent = (value: number) => ({ scale: 'percentage' as const, value });
  const resultAtLeast = (
    field: 'class10Result' | 'class12Result',
    value: number,
  ) =>
    scholarship([
      { field, op: 'gte', value: percent(value), changeable: true },
    ]);

  it('passes, fails and asks on the result the Criterion names', () => {
    const profile: Profile = {
      class: 12,
      class10Result: percent(70),
      class12Result: percent(90),
    };
    expect(bucketOf(profile, resultAtLeast('class12Result', 80))).toBe(
      'eligible',
    );
    expect(bucketOf(profile, resultAtLeast('class10Result', 80))).toBe(
      'hidden',
    );
    expect(
      cardFor({ class: 11 }, resultAtLeast('class12Result', 80)).missing,
    ).toEqual([{ field: 'class12Result', label: 'Class 12 result' }]);
  });

  it('is unknown for a result on another scale', () => {
    const onAnotherScale = scholarship([
      {
        field: 'class12Result',
        op: 'gte',
        value: { scale: 'ib_points', value: 36 },
        changeable: true,
      },
    ]);
    expect(
      bucketOf({ class: 12, class12Result: percent(95) }, onAnotherScale),
    ).toBe('tellUsMore');
  });

  it('gives a Class 12 Student with boards upcoming a Goal on the expected result', () => {
    const profile: Profile = {
      class: 12,
      boardsUpcoming: true,
      class12Result: percent(75),
    };
    expect(cardFor(profile, resultAtLeast('class12Result', 80)).goals).toEqual([
      'Score 80% in Class 12 to unlock this',
    ]);
    expect(bucketOf(profile, resultAtLeast('class12Result', 81))).toBe(
      'hidden',
    );
  });

  it('gives no Goal on a result whose boards are already taken', () => {
    const done: Profile = {
      class: 12,
      boardsUpcoming: false,
      class12Result: percent(78),
    };
    expect(bucketOf(done, resultAtLeast('class12Result', 80))).toBe('hidden');
    // A Class 12 Student's upcoming boards are Class 12's, not Class 10's.
    const class10Behind: Profile = {
      class: 12,
      boardsUpcoming: true,
      class10Result: percent(58),
    };
    expect(bucketOf(class10Behind, resultAtLeast('class10Result', 60))).toBe(
      'hidden',
    );
  });
});

const NEXT_YEAR = 'Eligible from next year: watch for the next round';
const UG_GOAL = 'Get admitted to an undergraduate course to unlock this';

describe('Matcher: class and UG admission', () => {
  const forClass = (op: Criterion['op'], value: unknown, changeable = true) =>
    scholarship([{ field: 'class', op, value, changeable }]);

  it.each<[string, Profile['class'], Criterion['op'], unknown]>([
    ['9 → 10', 9, 'in', [10]],
    ['10 → 11', 10, 'eq', 11],
    ['11 → 12', 11, 'in', [12]],
    ['10 → 11 with a minimum class', 10, 'gte', 11],
  ])('shows a next-class card for Class %s', (_, cls, op, value) => {
    const s = forClass(op, value);
    expect(bucketOf({ class: cls }, s)).toBe('withinReach');
    expect(cardFor({ class: cls }, s).goals).toEqual([NEXT_YEAR]);
  });

  it('hides a scholarship two classes up', () => {
    expect(bucketOf({ class: 9 }, forClass('in', [11]))).toBe('hidden');
  });

  it('hides a scholarship for a lower class', () => {
    expect(bucketOf({ class: 12 }, forClass('in', [11]))).toBe('hidden');
  });

  it('hides a class fail the Criterion says is not changeable', () => {
    expect(bucketOf({ class: 10 }, forClass('in', [11], false))).toBe('hidden');
  });

  it('shows a UG-admission scholarship to a Class 12 Student as Within reach', () => {
    const s = forClass('eq', 'ug');
    expect(bucketOf({ class: 12 }, s)).toBe('withinReach');
    expect(cardFor({ class: 12 }, s).goals).toEqual([UG_GOAL]);
  });

  it('hides a UG-admission scholarship from a Class 11 Student', () => {
    expect(bucketOf({ class: 11 }, forClass('in', ['ug']))).toBe('hidden');
  });

  it('passes a Class 12 Student when a scholarship accepts Class 12 or UG', () => {
    expect(bucketOf({ class: 12 }, forClass('in', [12, 'ug']))).toBe(
      'eligible',
    );
  });
});

describe('Matcher: the two-Goal cap', () => {
  const profile: Profile = {
    class: 10,
    class10Marks: 78,
    latestMarks: 78,
    boardsUpcoming: true,
  };
  const classUp = {
    field: 'class',
    op: 'in' as const,
    value: [11],
    changeable: true,
  };
  const marks = (field: string) => ({
    field,
    op: 'gte' as const,
    value: 80,
    changeable: true,
  });

  it('keeps a card with two Goals Within reach', () => {
    const s = scholarship([classUp, marks('latestMarks')]);
    expect(bucketOf(profile, s)).toBe('withinReach');
    expect(cardFor(profile, s).goals).toEqual([
      NEXT_YEAR,
      'Score 80% to unlock this',
    ]);
  });

  it('leaves out a card with three Goals', () => {
    const s = scholarship([
      classUp,
      marks('latestMarks'),
      marks('class10Marks'),
    ]);
    expect(bucketOf(profile, s)).toBe('hidden');
  });

  it('hides a card where one fail is changeable and another is not', () => {
    const s = scholarship([classUp, { field: 'gender', value: 'male' }]);
    expect(bucketOf({ ...profile, gender: 'female' }, s)).toBe('hidden');
  });
});

describe('Matcher: Deadline status', () => {
  const due = (deadline?: string) => scholarship([{}], { deadline });
  const eligibleProfile: Profile = { gender: 'female' };

  it.each<[string, string | undefined, string]>([
    ['no deadline', undefined, 'not_announced'],
    ['31 days away', '2026-08-20', 'open'],
    ['exactly 30 days away', '2026-08-19', 'closing_soon'],
    ['today', '2026-07-20', 'closing_soon'],
  ])('reports the status for %s', (_, deadline, status) => {
    expect(cardFor(eligibleProfile, due(deadline)).deadlineStatus).toBe(status);
  });

  it('drops a closed scholarship from every bucket', () => {
    const closed = (criteria: Partial<Criterion>[]) =>
      scholarship(criteria, { deadline: '2026-07-19' });
    expect(bucketOf(eligibleProfile, closed([{}]))).toBe('hidden');
    expect(bucketOf({}, closed([{}]))).toBe('hidden');
    const marks = closed([
      { field: 'latestMarks', op: 'gte', value: 80, changeable: true },
    ]);
    expect(bucketOf({ latestMarks: 78, boardsUpcoming: true }, marks)).toBe(
      'hidden',
    );
    const ug = closed([{ field: 'class', value: 'ug', changeable: true }]);
    expect(bucketOf({ class: 12 }, ug)).toBe('hidden');
  });

  it('keeps a closed next-class card, since the scheme recurs', () => {
    const s = scholarship(
      [{ field: 'class', op: 'in', value: [11], changeable: true }],
      { deadline: '2026-06-30' },
    );
    const card = cardFor({ class: 10 }, s);
    expect(card.goals).toEqual([NEXT_YEAR]);
    expect(card.deadlineStatus).toBe('closed');
  });
});

describe('Matcher: sort order', () => {
  const names = (cards: { name: string }[]) => cards.map((c) => c.name);

  it('sorts each bucket by deadline, soonest first, not announced last', () => {
    const r = match(
      { gender: 'female' },
      [
        scholarship([{}], { name: 'None', deadline: undefined }),
        scholarship([{}], { name: 'September', deadline: '2026-09-01' }),
        scholarship([{}], { name: 'August', deadline: '2026-08-01' }),
      ],
      TODAY,
    );
    expect(names(r.eligible)).toEqual(['August', 'September', 'None']);
  });

  it('sorts next-class cards after the rest of Within reach, each by deadline', () => {
    const nextClass = {
      field: 'class',
      op: 'in' as const,
      value: [11],
      changeable: true,
    };
    const marks = {
      field: 'latestMarks',
      op: 'gte' as const,
      value: 80,
      changeable: true,
    };
    const r = match(
      { class: 10, latestMarks: 78, boardsUpcoming: true },
      [
        scholarship([nextClass], { name: 'Next, none' }),
        scholarship([nextClass], {
          name: 'Next, past',
          deadline: '2026-06-01',
        }),
        scholarship([marks], { name: 'Marks, none' }),
        scholarship([marks], {
          name: 'Marks, December',
          deadline: '2026-12-01',
        }),
        scholarship([marks], { name: 'Marks, August', deadline: '2026-08-01' }),
      ],
      TODAY,
    );
    expect(names(r.withinReach)).toEqual([
      'Marks, August',
      'Marks, December',
      'Marks, none',
      'Next, past',
      'Next, none',
    ]);
  });
});

describe('Matcher: visible scholarships', () => {
  it('matches only active scholarships not needing review', () => {
    const r = match(
      { gender: 'female' },
      [
        scholarship([{}], { name: 'Live' }),
        scholarship([{}], { name: 'Inactive', status: 'inactive' }),
        scholarship([{}], { name: 'Needs review', needsReview: true }),
      ],
      TODAY,
    );
    expect(r.eligible.map((c) => c.name)).toEqual(['Live']);
  });
});

describe('Matcher: missing fields', () => {
  it('names each missing field once, in words a Student understands', () => {
    const s = scholarship([
      { field: 'incomeBand', op: 'lte', value: 250000 },
      { field: 'incomeBand', op: 'gte', value: 100000 },
      { field: 'domicileState', value: 'kerala' },
    ]);
    expect(cardFor({}, s).missing).toEqual([
      { field: 'incomeBand', label: 'family income' },
      { field: 'domicileState', label: 'home state' },
    ]);
  });
});

describe('Matcher: where the Student lives and their Citizenship', () => {
  const homeState = (value: string[]) =>
    scholarship([{ field: 'homeState', op: 'in', value }]);
  const inIndia = (region: string): Profile => ({
    countryOfResidence: 'IN',
    region,
  });

  it.each<[string, Profile, string]>([
    ['a Student in India judged on their region', inIndia('IN-KL'), 'eligible'],
    ['a Student in another Indian state', inIndia('IN-GA'), 'hidden'],
    [
      'a Student in India with no region',
      { countryOfResidence: 'IN' },
      'tellUsMore',
    ],
    [
      'a Student abroad judged on the Home state they gave',
      { countryOfResidence: 'AE', homeState: 'kerala' },
      'eligible',
    ],
    [
      'a Student abroad with no Home state',
      { countryOfResidence: 'AE' },
      'tellUsMore',
    ],
    [
      'an old Profile giving a domicile state',
      { domicileState: 'kerala' },
      'eligible',
    ],
  ])('Home state: %s', (_, profile, bucket) => {
    expect(bucketOf(profile, homeState(['kerala']))).toBe(bucket);
  });

  it('judges an old domicile Criterion on the Home state', () => {
    const domicile = scholarship([
      { field: 'domicileState', op: 'in', value: ['kerala'] },
    ]);
    expect(bucketOf(inIndia('IN-KL'), domicile)).toBe('eligible');
    expect(
      bucketOf({ countryOfResidence: 'AE', homeState: 'goa' }, domicile),
    ).toBe('hidden');
  });

  it('judges country of residence, region and Residence status as given', () => {
    const singapore = scholarship([
      { field: 'countryOfResidence', op: 'in', value: ['SG'] },
      {
        field: 'residenceStatus',
        op: 'in',
        value: ['citizen', 'permanent_resident'],
      },
    ]);
    expect(
      bucketOf(
        { countryOfResidence: 'SG', residenceStatus: 'permanent_resident' },
        singapore,
      ),
    ).toBe('eligible');
    expect(
      bucketOf(
        { countryOfResidence: 'SG', residenceStatus: 'visa' },
        singapore,
      ),
    ).toBe('hidden');
    expect(bucketOf({ countryOfResidence: 'IN' }, singapore)).toBe('hidden');
    expect(bucketOf({ countryOfResidence: 'SG' }, singapore)).toBe(
      'tellUsMore',
    );
    const ontario = scholarship([
      { field: 'region', op: 'in', value: ['CA-ON'] },
    ]);
    expect(
      bucketOf({ countryOfResidence: 'CA', region: 'CA-ON' }, ontario),
    ).toBe('eligible');
  });

  it('counts an Indian citizen as a citizen of India, and an OCI card holder as no one country', () => {
    const britons = scholarship([
      { field: 'citizenshipCountry', op: 'in', value: ['GB'] },
    ]);
    expect(bucketOf({ citizenship: 'indian' }, britons)).toBe('hidden');
    expect(bucketOf({ citizenship: 'oci' }, britons)).toBe('tellUsMore');
    expect(
      bucketOf({ citizenship: 'other', citizenshipCountry: 'GB' }, britons),
    ).toBe('eligible');
  });

  it('judges Citizenship over Indian citizens, OCI card holders and others', () => {
    const indianOrOci = scholarship([
      { field: 'citizenship', op: 'in', value: ['indian', 'oci'] },
    ]);
    expect(bucketOf({ citizenship: 'oci' }, indianOrOci)).toBe('eligible');
    expect(bucketOf({ citizenship: 'other' }, indianOrOci)).toBe('hidden');
  });

  it('names the new fields in words a Student understands', () => {
    const s = scholarship([
      { field: 'countryOfResidence', op: 'in', value: ['AE'] },
      { field: 'region', op: 'in', value: ['AE-DU'] },
      { field: 'homeState', op: 'in', value: ['kerala'] },
      { field: 'residenceStatus', op: 'in', value: ['citizen'] },
      { field: 'citizenshipCountry', op: 'in', value: ['AE'] },
    ]);
    expect(cardFor({}, s).missing).toEqual([
      { field: 'countryOfResidence', label: 'the country you live in' },
      { field: 'region', label: 'the state or region you live in' },
      { field: 'homeState', label: 'home state' },
      { field: 'residenceStatus', label: 'residence status' },
      { field: 'citizenshipCountry', label: 'country of citizenship' },
    ]);
  });
});
