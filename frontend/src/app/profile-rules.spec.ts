import {
  applyChange,
  boardMarksLabel,
  checkAnswer,
  migrateSavedProfile,
  profileForMatch,
  visibleQuestions,
} from './profile-rules';

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

  it('asks every other question of every Student', () => {
    const shown = visibleQuestions({ class: 9, gender: 'male' });
    for (const question of ['class', 'gender', 'board', 'citizenship'] as const) {
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

  it('drops an answer set back to nothing', () => {
    expect(applyChange({ board: 'cbse', gender: 'male' }, { board: undefined })).toEqual({
      gender: 'male',
    });
  });
});

describe('checkAnswer', () => {
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
    expect(profileForMatch({ class: 9, class10Result: percent(80), stream: 'arts' })).toEqual({
      class: 9,
    });
  });
});

// Board marks: which results are asked, how they are labelled, the answers a
// change clears, the range each scale allows and what a saved Profile keeps.
const percent = (value: number) => ({ scale: 'percentage' as const, value });

describe('Board marks', () => {
  const asked = (profile: Parameters<typeof visibleQuestions>[0]) => {
    const shown = visibleQuestions(profile);
    return {
      class10Result: shown.has('class10Result'),
      class12Result: shown.has('class12Result'),
      boardsUpcoming: shown.has('boardsUpcoming'),
    };
  };

  it.each([
    ['Class 9', { class: 9 }, false, false, false],
    ['Class 10, boards upcoming', { class: 10, boardsUpcoming: true }, false, false, true],
    ['Class 10, boards done', { class: 10, boardsUpcoming: false }, true, false, true],
    ['Class 11', { class: 11 }, true, false, false],
    ['Class 12, boards upcoming', { class: 12, boardsUpcoming: true }, true, true, true],
    ['Class 12, boards done', { class: 12, boardsUpcoming: false }, true, true, true],
    ['class not given', {}, true, true, false],
  ] as const)(
    'follows the grid for %s',
    (_, profile, class10Result, class12Result, boardsUpcoming) => {
      expect(asked(profile)).toEqual({ class10Result, class12Result, boardsUpcoming });
    },
  );

  it('labels the Class 12 result as expected while boards are upcoming', () => {
    expect(boardMarksLabel('class12Result', { class: 12, boardsUpcoming: true })).toBe(
      'Expected Class 12 result (pre-boards or predicted)',
    );
    expect(boardMarksLabel('class12Result', { class: 12, boardsUpcoming: false })).toBe(
      'Class 12 board result',
    );
    expect(boardMarksLabel('class10Result', { class: 11 })).toBe('Class 10 board result');
  });

  it('clears the results and boards-upcoming answer a new class rules out', () => {
    expect(
      applyChange(
        { class: 12, boardsUpcoming: true, class10Result: percent(80), class12Result: percent(75) },
        { class: 11 },
      ),
    ).toEqual({ class: 11, class10Result: percent(80) });
    expect(applyChange({ class: 11, class10Result: percent(80) }, { class: 9 })).toEqual({
      class: 9,
    });
  });

  it('clears the Class 10 result when a Class 10 Student says boards are upcoming', () => {
    expect(
      applyChange(
        { class: 10, boardsUpcoming: false, class10Result: percent(80) },
        {
          boardsUpcoming: true,
        },
      ),
    ).toEqual({ class: 10, boardsUpcoming: true });
  });

  it.each([0, 55.5, 100])('accepts a percentage of %s', (value) => {
    expect(checkAnswer('class10Result', percent(value))).toBeUndefined();
    expect(checkAnswer('class12Result', percent(value))).toBeUndefined();
  });

  it.each([-1, 100.1, 105, NaN])('refuses a percentage of %s rather than clamping it', (value) => {
    expect(checkAnswer('class10Result', percent(value))).toBe('Enter a percentage from 0 to 100.');
    expect(checkAnswer('class12Result', percent(value))).toBe('Enter a percentage from 0 to 100.');
  });

  it('refuses a result on a scale it does not know', () => {
    expect(checkAnswer('class12Result', { scale: 'stanine', value: 7 })).toBe(
      'Pick the scale your result is given on.',
    );
  });

  it('drops latest exam marks from a saved Profile and keeps Class 10 marks as the Class 10 result', () => {
    expect(
      migrateSavedProfile({ class: 12, latestMarks: 85, class10Marks: 91, gender: 'female' }),
    ).toEqual({ class: 12, class10Result: percent(91), gender: 'female' });
  });

  it('leaves a saved Profile with nothing to migrate as it is', () => {
    expect(migrateSavedProfile({ class: 11, class10Result: percent(70) })).toEqual({
      class: 11,
      class10Result: percent(70),
    });
  });
});
