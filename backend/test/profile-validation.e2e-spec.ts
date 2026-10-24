import { Harness, startApp } from './harness.js';

const SANTOOR = 'https://www.santoorscholarships.com/';

describe('Match request Profile validation', () => {
  let harness: Harness;

  beforeAll(async () => {
    harness = await startApp({
      fixtures: { [SANTOOR]: 'santoor-scholarship.html' },
      now: new Date('2026-07-20T09:00:00Z'),
    });
    await harness.ingest();
  });

  afterAll(() => harness.close());

  const matchWith = (profile: unknown) =>
    harness
      .http()
      .post('/api/match')
      .send(profile as object);

  it('still matches a valid Profile with every field answered', async () => {
    const res = await matchWith({
      class: 12,
      domicileState: 'kerala',
      schoolState: 'kerala',
      schoolType: 'government',
      citizenship: 'indian',
      board: 'state',
      boardsUpcoming: true,
      class10Result: { scale: 'percentage', value: 92.5 },
      class12Result: { scale: 'percentage', value: 88 },
      stream: 'science',
      fieldOfStudy: 'engineering',
      destination: 'india',
      incomeBand: '1l_2l',
      gender: 'female',
      category: 'obc',
      minority: false,
      disability: false,
      singleGirlChild: true,
      parentOccupation: ['none'],
      examsQualified: ['nmms', 'olympiad'],
    }).expect(200);
    expect(res.body.eligible).toEqual([
      expect.objectContaining({ name: "Santoor Women's Scholarship" }),
    ]);
  });

  it('still matches an empty Profile', async () => {
    await matchWith({}).expect(200);
  });

  it.each([
    [
      'a mark over 100',
      { class10Marks: 105 },
      'class10Marks must be from 0 to 100',
    ],
    [
      'a negative mark',
      { latestMarks: -1 },
      'latestMarks must be from 0 to 100',
    ],
    [
      'a mark that is not a number',
      { latestMarks: '90' },
      'latestMarks must be from 0 to 100',
    ],
    [
      'a class outside 9 to 12',
      { class: 8 },
      'class must be one of 9, 10, 11, 12',
    ],
    [
      'an unknown gender',
      { gender: 'unknown' },
      'gender must be one of female, male, other',
    ],
    [
      'an unknown state',
      { domicileState: 'atlantis' },
      expect.stringMatching(/^domicileState must be one of andhra_pradesh, /),
    ],
    [
      'an unknown income band',
      { incomeBand: 'over_9000' },
      expect.stringMatching(/^incomeBand must be one of under_1l, /),
    ],
    [
      'an unknown exam in a list',
      { examsQualified: ['nmms', 'jee'] },
      'examsQualified must be a list of nmms, olympiad, other',
    ],
    [
      'a yes/no answer that is not',
      { minority: 'yes' },
      'minority must be true or false',
    ],
    [
      'single girl child with gender male',
      { gender: 'male', singleGirlChild: true },
      'singleGirlChild is only asked when gender is female',
    ],
    [
      'a stream before Class 11',
      { class: 10, stream: 'science' },
      'stream is only asked from Class 11',
    ],
    [
      'Class 10 marks in Class 9',
      { class: 9, class10Marks: 80 },
      'class10Marks is not asked in Class 9',
    ],
    // Board marks: a result on its scale's range, only where the grid asks it.
    [
      'a Class 12 result over 100%',
      { class12Result: { scale: 'percentage', value: 105 } },
      'class12Result.value must be from 0 to 100',
    ],
    [
      'a Class 10 result with no scale',
      { class10Result: { value: 80 } },
      'class10Result.scale is required',
    ],
    [
      'a Class 10 result that is a bare number',
      { class10Result: 80 },
      'class10Result must be a result with a scale and a value',
    ],
    [
      'a Class 10 result in Class 9',
      { class: 9, class10Result: { scale: 'percentage', value: 80 } },
      'class10Result is only asked from Class 10, once Class 10 boards are done',
    ],
    [
      'a Class 10 result while Class 10 boards are upcoming',
      {
        class: 10,
        boardsUpcoming: true,
        class10Result: { scale: 'percentage', value: 80 },
      },
      'class10Result is only asked from Class 10, once Class 10 boards are done',
    ],
    [
      'a Class 12 result in Class 11',
      { class: 11, class12Result: { scale: 'percentage', value: 80 } },
      'class12Result is only asked in Class 12',
    ],
    [
      'boards upcoming in Class 11',
      { class: 11, boardsUpcoming: true },
      'boardsUpcoming is only asked in Class 10 or 12',
    ],
    [
      'boards upcoming with no class',
      { boardsUpcoming: false },
      'boardsUpcoming is only asked in Class 10 or 12',
    ],
  ])('answers 400 for %s, naming the field', async (_, profile, reason) => {
    const res = await matchWith(profile).expect(400);
    expect(res.body.message).toEqual([reason]);
  });

  it('lists every bad field at once', async () => {
    const res = await matchWith({
      class10Marks: 101,
      gender: 'robot',
    }).expect(400);
    expect(res.body.message).toHaveLength(2);
  });

  it('answers 400 for a body that is not a Profile', async () => {
    const res = await matchWith([1, 2]).expect(400);
    expect(res.body.message).toEqual(['The Profile must be an object']);
  });
});
