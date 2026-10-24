import { applyChange, checkAnswer, profileForMatch, visibleQuestions } from './profile-rules';

describe('visibleQuestions', () => {
  it('asks single girl child only of a female Student', () => {
    expect(visibleQuestions({ gender: 'female' }).has('singleGirlChild')).toBe(true);
    expect(visibleQuestions({ gender: 'male' }).has('singleGirlChild')).toBe(false);
    expect(visibleQuestions({}).has('singleGirlChild')).toBe(false);
  });

  it('asks the stream only from Class 11, or when class is not given', () => {
    expect(visibleQuestions({ class: 9 }).has('stream')).toBe(false);
    expect(visibleQuestions({ class: 10 }).has('stream')).toBe(false);
    expect(visibleQuestions({ class: 11 }).has('stream')).toBe(true);
    expect(visibleQuestions({ class: 12 }).has('stream')).toBe(true);
    expect(visibleQuestions({}).has('stream')).toBe(true);
  });

  it('hides Class 10 board marks from a Class 9 Student', () => {
    expect(visibleQuestions({ class: 9 }).has('class10Marks')).toBe(false);
    expect(visibleQuestions({ class: 10 }).has('class10Marks')).toBe(true);
    expect(visibleQuestions({}).has('class10Marks')).toBe(true);
  });

  it('asks every other question of every Student', () => {
    const shown = visibleQuestions({ class: 9, gender: 'male' });
    for (const question of ['class', 'gender', 'latestMarks', 'board', 'citizenship'] as const) {
      expect(shown.has(question)).toBe(true);
    }
  });
});

describe('applyChange', () => {
  it('clears single girl child when gender stops being female', () => {
    expect(applyChange({ gender: 'female', singleGirlChild: true }, { gender: 'male' })).toEqual({
      gender: 'male',
    });
    expect(applyChange({ gender: 'female', singleGirlChild: true }, { gender: undefined })).toEqual(
      {},
    );
  });

  it('keeps single girl child for a female Student', () => {
    expect(applyChange({ gender: 'female' }, { singleGirlChild: true })).toEqual({
      gender: 'female',
      singleGirlChild: true,
    });
  });

  it('clears the stream when class moves below Class 11', () => {
    expect(applyChange({ class: 11, stream: 'science' }, { class: 10 })).toEqual({ class: 10 });
  });

  it('clears Class 10 board marks when class moves to Class 9', () => {
    expect(applyChange({ class: 10, class10Marks: 80 }, { class: 9 })).toEqual({ class: 9 });
  });

  it('drops an answer set back to nothing', () => {
    expect(applyChange({ board: 'cbse', gender: 'male' }, { board: undefined })).toEqual({
      gender: 'male',
    });
  });
});

describe('checkAnswer', () => {
  it.each([0, 55.5, 100])('accepts marks of %s', (marks) => {
    expect(checkAnswer('class10Marks', marks)).toBeUndefined();
    expect(checkAnswer('latestMarks', marks)).toBeUndefined();
  });

  it.each([-1, 100.1, 105, NaN])('refuses marks of %s rather than clamping them', (marks) => {
    expect(checkAnswer('class10Marks', marks)).toBe('Enter a percentage from 0 to 100.');
    expect(checkAnswer('latestMarks', marks)).toBe('Enter a percentage from 0 to 100.');
  });

  it('has no range for a fixed-list answer', () => {
    expect(checkAnswer('gender', 'female')).toBeUndefined();
  });
});

describe('profileForMatch', () => {
  it('falls back to the domicile state and drops contradictions', () => {
    expect(
      profileForMatch({ domicileState: 'bihar', gender: 'other', singleGirlChild: true }),
    ).toEqual({ domicileState: 'bihar', schoolState: 'bihar', gender: 'other' });
  });

  it('drops answers a saved Profile kept from before a rule existed', () => {
    expect(profileForMatch({ class: 9, class10Marks: 80, stream: 'arts' })).toEqual({ class: 9 });
  });
});
