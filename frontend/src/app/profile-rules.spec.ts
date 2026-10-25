import { Profile } from './profile-fields';
import {
  applyChange,
  applyScaleChange,
  boardMarksLabel,
  checkAnswer,
  incomeCurrency,
  findSubjects,
  migrateSavedProfile,
  profileForMatch,
  Question,
  readResult,
  resultScale,
  SLOT_SCALES,
  subjectAnswer,
  subjectNote,
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
  it('drops contradictions', () => {
    expect(profileForMatch({ gender: 'other', singleGirlChild: true })).toEqual({
      gender: 'other',
    });
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

  it('drops answers to questions the form no longer has from a saved Profile', () => {
    expect(
      migrateSavedProfile({
        class: 12,
        latestMarks: 85,
        class10Marks: 91,
        domicileState: 'kerala',
        schoolState: 'kerala',
        gender: 'female',
      }),
    ).toEqual({ class: 12, gender: 'female' });
  });

  it('leaves a saved Profile with nothing to migrate as it is', () => {
    expect(migrateSavedProfile({ class: 11, class10Result: percent(70) })).toEqual({
      class: 11,
      class10Result: percent(70),
    });
  });
});

// Result scales: the scale a board presets, board narrowing of the grid, the
// range each scale allows, and the answers a change of board clears.
describe('Result scales', () => {
  const asked = (profile: Profile) => {
    const shown = visibleQuestions(profile);
    return {
      class10Result: shown.has('class10Result'),
      class12Result: shown.has('class12Result'),
      boardsUpcoming: shown.has('boardsUpcoming'),
    };
  };

  it.each([
    ['IB, Class 10', { board: 'ib', class: 10 }, false, false, false],
    ['IB, Class 11', { board: 'ib', class: 11 }, false, false, false],
    ['IB, Class 12', { board: 'ib', class: 12 }, false, true, true],
    ['Cambridge/UK, Class 12', { board: 'cambridge', class: 12 }, false, true, true],
    ['US high school, Class 10', { board: 'us_high_school', class: 10 }, false, false, false],
    ['US high school, Class 12', { board: 'us_high_school', class: 12 }, false, true, false],
    ['IB, class not given', { board: 'ib' }, false, true, false],
    ['CBSE, Class 12', { board: 'cbse', class: 12 }, true, true, true],
  ] as const)(
    'narrows the grid by board for %s',
    (_, profile, class10Result, class12Result, boardsUpcoming) => {
      expect(asked(profile)).toEqual({ class10Result, class12Result, boardsUpcoming });
    },
  );

  it.each([
    ['class12Result', 'cbse', 'percentage'],
    ['class12Result', 'cisce', 'percentage'],
    ['class12Result', 'state', 'percentage'],
    ['class12Result', 'cambridge', 'a_level'],
    ['class12Result', 'ib', 'ib_points'],
    ['class12Result', 'us_high_school', 'gpa_4'],
    ['class12Result', undefined, 'percentage'],
    ['class10Result', 'cbse', 'percentage'],
  ] as const)('presets the %s scale for the %s board to %s', (question, board, scale) => {
    expect(resultScale(question, { board })).toBe(scale);
  });

  it('keeps the scale the Student picked, or the one their result is on', () => {
    expect(resultScale('class10Result', { board: 'cbse' }, 'cgpa_10')).toBe('cgpa_10');
    expect(resultScale('class12Result', { board: 'ib', class12Result: percent(80) })).toBe(
      'percentage',
    );
    // CGPA is a Class 10 scale only.
    expect(resultScale('class12Result', { board: 'cbse' }, 'cgpa_10')).toBe('percentage');
  });

  it('offers CGPA only for the Class 10 result, and the foreign scales only for Class 12', () => {
    expect(SLOT_SCALES.class10Result).toEqual(['percentage', 'cgpa_10']);
    expect(SLOT_SCALES.class12Result).toEqual(['percentage', 'gpa_4', 'ib_points', 'a_level']);
  });

  it.each([
    ['gpa_4', 'High-school GPA'],
    ['ib_points', 'IB Diploma points'],
    ['a_level', 'A-level grades'],
    ['percentage', 'Class 12 board result'],
  ] as const)('labels a Class 12 result on %s as "%s"', (scale, label) => {
    expect(boardMarksLabel('class12Result', { class: 12 }, scale)).toBe(label);
  });

  it("labels the Class 12 result on the board's own scale when none is picked", () => {
    expect(boardMarksLabel('class12Result', { board: 'us_high_school', class: 12 })).toBe(
      'High-school GPA',
    );
    expect(boardMarksLabel('class12Result', { board: 'ib', class: 12 })).toBe('IB Diploma points');
  });

  it('labels an expected IB or A-level result as predicted while boards are upcoming', () => {
    const upcoming = { class: 12, boardsUpcoming: true } as const;
    expect(boardMarksLabel('class12Result', upcoming, 'ib_points')).toBe(
      'Predicted IB Diploma points',
    );
    expect(boardMarksLabel('class12Result', upcoming, 'a_level')).toBe('Predicted A-level grades');
  });

  it('clears a result when its scale changes, and keeps it on the same scale', () => {
    const profile = {
      class: 12,
      class10Result: percent(90),
      class12Result: percent(85),
    } as const;
    expect(applyScaleChange(profile, 'class12Result', 'ib_points')).toEqual({
      class: 12,
      class10Result: percent(90),
    });
    expect(applyScaleChange(profile, 'class12Result', 'percentage')).toEqual(profile);
    expect(applyScaleChange(profile, 'class10Result', 'cgpa_10')).toEqual({
      class: 12,
      class12Result: percent(85),
    });
  });

  it('clears both results when the board changes', () => {
    expect(
      applyChange(
        { class: 12, board: 'cbse', class10Result: percent(90), class12Result: percent(85) },
        { board: 'state' },
      ),
    ).toEqual({ class: 12, board: 'state' });
    const kept = { class: 12, board: 'cbse', class12Result: percent(85) } as const;
    expect(applyChange(kept, { gender: 'male' })).toEqual({ ...kept, gender: 'male' });
  });

  it.each([
    ['class10Result', { scale: 'cgpa_10', value: 9.2 }],
    ['class12Result', { scale: 'gpa_4', value: 4 }],
    ['class12Result', { scale: 'ib_points', value: 45 }],
    ['class12Result', { scale: 'a_level', value: ['A*', 'A', 'E'] }],
  ] as const)('accepts a %s of %j', (question, result) => {
    expect(checkAnswer(question, result)).toBeUndefined();
  });

  it.each([
    ['class10Result', { scale: 'cgpa_10', value: 10.5 }, 'Enter a CGPA from 0 to 10.'],
    ['class12Result', { scale: 'gpa_4', value: 4.3 }, 'Enter a GPA from 0 to 4.'],
    ['class12Result', { scale: 'ib_points', value: 46 }, 'Enter whole IB points from 0 to 45.'],
    ['class12Result', { scale: 'ib_points', value: 36.5 }, 'Enter whole IB points from 0 to 45.'],
    [
      'class12Result',
      { scale: 'a_level', value: ['A', 'F*'] },
      'Enter A-level grades from A* to E, such as A*AB.',
    ],
    [
      'class12Result',
      { scale: 'a_level', value: [] },
      'Enter A-level grades from A* to E, such as A*AB.',
    ],
    ['class12Result', { scale: 'cgpa_10', value: 9 }, 'Pick the scale your result is given on.'],
  ] as const)('refuses a %s of %j', (question, result, message) => {
    expect(checkAnswer(question, result)).toBe(message);
  });

  it('reads a typed result on its scale', () => {
    expect(readResult('a_level', 'a*ab')).toEqual({ scale: 'a_level', value: ['A*', 'A', 'B'] });
    expect(readResult('a_level', 'A* A F*')).toEqual({
      scale: 'a_level',
      value: ['A*', 'A', 'F*'],
    });
    expect(readResult('ib_points', '38')).toEqual({ scale: 'ib_points', value: 38 });
    expect(readResult('gpa_4', ' ')).toBeUndefined();
  });
});

// Country of residence, region, Home state, Residence status and Citizenship.
describe('where the Student lives and their Citizenship', () => {
  const asked = (profile: Profile, question: Question) => visibleQuestions(profile).has(question);

  it('asks the state or region only once a country is picked', () => {
    expect(asked({}, 'region')).toBe(false);
    expect(asked({ countryOfResidence: 'AE' }, 'region')).toBe(true);
  });

  it('asks Home state and Residence status only of a Student living outside India', () => {
    for (const question of ['homeState', 'residenceStatus'] as const) {
      expect(asked({}, question)).toBe(false);
      expect(asked({ countryOfResidence: 'IN' }, question)).toBe(false);
      expect(asked({ countryOfResidence: 'AE' }, question)).toBe(true);
    }
  });

  it('asks the Citizenship country only of another nationality', () => {
    expect(asked({}, 'citizenshipCountry')).toBe(false);
    expect(asked({ citizenship: 'indian' }, 'citizenshipCountry')).toBe(false);
    expect(asked({ citizenship: 'oci' }, 'citizenshipCountry')).toBe(false);
    expect(asked({ citizenship: 'other' }, 'citizenshipCountry')).toBe(true);
  });

  it('asks category of Indian citizens and OCI card holders, not of another nationality', () => {
    expect(asked({}, 'category')).toBe(true);
    expect(asked({ citizenship: 'indian' }, 'category')).toBe(true);
    expect(asked({ citizenship: 'oci' }, 'category')).toBe(true);
    expect(asked({ citizenship: 'other' }, 'category')).toBe(false);
  });

  it('clears region, Home state and Residence status when the country changes', () => {
    const abroad: Profile = {
      countryOfResidence: 'AE',
      region: 'AE-DU',
      homeState: 'kerala',
      residenceStatus: 'visa',
      gender: 'female',
    };
    expect(applyChange(abroad, { countryOfResidence: 'GB' })).toEqual({
      countryOfResidence: 'GB',
      gender: 'female',
    });
    expect(applyChange(abroad, { countryOfResidence: 'IN' })).toEqual({
      countryOfResidence: 'IN',
      gender: 'female',
    });
    expect(applyChange(abroad, { countryOfResidence: undefined })).toEqual({ gender: 'female' });
  });

  it('keeps the answers that depend on the country when something else changes', () => {
    const abroad: Profile = { countryOfResidence: 'AE', region: 'AE-DU', homeState: 'kerala' };
    expect(applyChange(abroad, { residenceStatus: 'permanent_resident' })).toEqual({
      ...abroad,
      residenceStatus: 'permanent_resident',
    });
    expect(applyChange(abroad, { countryOfResidence: 'AE' })).toEqual(abroad);
  });

  it('never keeps a region from another country, or one that does not exist', () => {
    expect(applyChange({ countryOfResidence: 'IN' }, { region: 'AE-DU' })).toEqual({
      countryOfResidence: 'IN',
    });
    expect(applyChange({ countryOfResidence: 'IN' }, { region: 'IN-XX' })).toEqual({
      countryOfResidence: 'IN',
    });
    expect(applyChange({ countryOfResidence: 'IN' }, { region: 'IN-KL' })).toEqual({
      countryOfResidence: 'IN',
      region: 'IN-KL',
    });
  });

  it('clears category when Citizenship moves to another nationality', () => {
    expect(
      applyChange({ citizenship: 'indian', category: 'sc' }, { citizenship: 'other' }),
    ).toEqual({ citizenship: 'other' });
    expect(applyChange({ citizenship: 'indian', category: 'sc' }, { citizenship: 'oci' })).toEqual({
      citizenship: 'oci',
      category: 'sc',
    });
  });

  it('clears the Citizenship country when Citizenship leaves another nationality', () => {
    expect(
      applyChange({ citizenship: 'other', citizenshipCountry: 'GB' }, { citizenship: 'oci' }),
    ).toEqual({ citizenship: 'oci' });
  });

  it('sends where the Student lives as given', () => {
    expect(profileForMatch({ countryOfResidence: 'IN', region: 'IN-KL' })).toEqual({
      countryOfResidence: 'IN',
      region: 'IN-KL',
    });
    expect(profileForMatch({ countryOfResidence: 'AE', homeState: 'goa' })).toEqual({
      countryOfResidence: 'AE',
      homeState: 'goa',
    });
  });
});

// Family income: rupee bands in India, an amount in a currency abroad.
describe('family income', () => {
  const asked = (profile: Profile, question: Question) => visibleQuestions(profile).has(question);
  const dirhams = (value: number) => ({ currency: 'AED', value });

  it('asks a Student living outside India for an amount, and a Student in India for a band', () => {
    expect(asked({ countryOfResidence: 'AE' }, 'incomeAmount')).toBe(true);
    expect(asked({ countryOfResidence: 'AE' }, 'incomeBand')).toBe(false);
    expect(asked({ countryOfResidence: 'IN' }, 'incomeAmount')).toBe(false);
    expect(asked({ countryOfResidence: 'IN' }, 'incomeBand')).toBe(true);
  });

  it('asks a Student who gives no country for a band, as before', () => {
    expect(asked({}, 'incomeBand')).toBe(true);
    expect(asked({}, 'incomeAmount')).toBe(false);
  });

  it('clears the band when the Student moves abroad, and the amount when they move to India', () => {
    expect(
      applyChange({ countryOfResidence: 'IN', incomeBand: '1l_2l' }, { countryOfResidence: 'AE' }),
    ).toEqual({ countryOfResidence: 'AE' });
    expect(
      applyChange(
        { countryOfResidence: 'AE', incomeAmount: dirhams(90000) },
        { countryOfResidence: 'IN' },
      ),
    ).toEqual({ countryOfResidence: 'IN' });
    expect(
      applyChange(
        { countryOfResidence: 'AE', incomeAmount: dirhams(90000) },
        { countryOfResidence: undefined },
      ),
    ).toEqual({});
  });

  it('keeps the amount, in the currency given, when the Student moves to another country abroad', () => {
    expect(
      applyChange(
        { countryOfResidence: 'AE', incomeAmount: dirhams(90000) },
        { countryOfResidence: 'GB' },
      ),
    ).toEqual({ countryOfResidence: 'GB', incomeAmount: dirhams(90000) });
  });

  it("offers the country's currency until the Student gives another", () => {
    expect(incomeCurrency({ countryOfResidence: 'AE' })).toBe('AED');
    expect(incomeCurrency({ countryOfResidence: 'GB' })).toBe('GBP');
    expect(incomeCurrency({ countryOfResidence: 'DE' })).toBe('EUR');
    expect(
      incomeCurrency({ countryOfResidence: 'AE', incomeAmount: { currency: 'USD', value: 1 } }),
    ).toBe('USD');
    expect(incomeCurrency({ countryOfResidence: 'AQ' })).toBeUndefined();
  });

  it('refuses a negative amount, an amount that is no number, and an unknown currency', () => {
    expect(checkAnswer('incomeAmount', dirhams(90000))).toBeUndefined();
    expect(checkAnswer('incomeAmount', dirhams(0))).toBeUndefined();
    expect(checkAnswer('incomeAmount', dirhams(-1))).toBe('Enter an amount of 0 or more.');
    expect(checkAnswer('incomeAmount', dirhams(Number.NaN))).toBe('Enter an amount of 0 or more.');
    expect(checkAnswer('incomeAmount', { currency: 'XYZ', value: 100 })).toBe(
      'Pick the currency your family income is in.',
    );
  });
});

describe('migrateSavedProfile: residence', () => {
  it('keeps Citizenship as it was: Indian stays Indian, other stays other with no country', () => {
    expect(migrateSavedProfile({ citizenship: 'indian' })).toEqual({ citizenship: 'indian' });
    expect(migrateSavedProfile({ citizenship: 'other' })).toEqual({ citizenship: 'other' });
  });

  it('leaves a Profile without old answers as it is', () => {
    const profile = { countryOfResidence: 'GB', region: 'GB-ENG', class: 11 };
    expect(migrateSavedProfile(profile)).toEqual(profile);
  });
});

describe('field of study', () => {
  it('finds subjects by any part of their name, ignoring case', () => {
    const found = findSubjects('marine').map((s) => s.label);
    expect(found).toContain('Marine biology');
    expect(found).toContain('Marine engineering');
    expect(found).not.toContain('Law');
  });

  it('puts every subject in a Field of study group', () => {
    expect(findSubjects('Marine biology')).toEqual([{ label: 'Marine biology', group: 'science' }]);
    expect(findSubjects('Mechanical engineering')).toEqual([
      { label: 'Mechanical engineering', group: 'engineering' },
    ]);
  });

  it('answers with the group of a listed subject, however it is typed', () => {
    expect(subjectAnswer('marine biology')).toEqual({
      fieldOfStudy: 'science',
      subject: 'Marine biology',
    });
  });

  it('counts a subject the Student types as Other, keeping their words', () => {
    expect(subjectAnswer('  Puppetry ')).toEqual({ fieldOfStudy: 'other', subject: 'Puppetry' });
  });

  it('clears the subject, keeping the group, when the subject field is emptied', () => {
    expect(
      applyChange({ fieldOfStudy: 'science', subject: 'Marine biology' }, subjectAnswer(' ')),
    ).toEqual({ fieldOfStudy: 'science' });
  });

  it('shows the Student how their subject is used', () => {
    expect(subjectNote({ fieldOfStudy: 'science', subject: 'Marine biology' })).toBe(
      'Counted as Natural sciences.',
    );
    expect(subjectNote({ fieldOfStudy: 'other', subject: 'Puppetry' })).toBe(
      '"Puppetry" is not on our list, so it is counted as Other.',
    );
    expect(subjectNote({ fieldOfStudy: 'law' })).toBeUndefined();
  });

  it('clears a subject outside the group the Student picks', () => {
    const marine = { fieldOfStudy: 'science', subject: 'Marine biology' } as const;
    expect(applyChange(marine, { fieldOfStudy: 'law' })).toEqual({ fieldOfStudy: 'law' });
    expect(applyChange(marine, { fieldOfStudy: undefined })).toEqual({});
    expect(
      applyChange({ fieldOfStudy: 'other', subject: 'Puppetry' }, { fieldOfStudy: 'arts' }),
    ).toEqual({
      fieldOfStudy: 'arts',
    });
    expect(applyChange(marine, { gender: 'female' })).toEqual({ ...marine, gender: 'female' });
  });

  it('sends the group in a Match request, never the subject', () => {
    expect(profileForMatch({ fieldOfStudy: 'other', subject: 'Puppetry' })).toEqual({
      fieldOfStudy: 'other',
    });
  });
});

describe('migrateSavedProfile: field of study and destination', () => {
  it.each(['uk', 'other'])('drops a saved destination of %s, which is no country code', (saved) => {
    expect(migrateSavedProfile({ destination: saved, gender: 'male' })).toEqual({
      gender: 'male',
    });
  });

  it('keeps a destination that is already a country code', () => {
    expect(migrateSavedProfile({ destination: 'SG' })).toEqual({ destination: 'SG' });
  });

  it.each(['engineering', 'medicine', 'science', 'commerce', 'arts', 'law', 'other'])(
    'keeps a saved field of study of %s as its group',
    (saved) => {
      expect(migrateSavedProfile({ fieldOfStudy: saved })).toEqual({ fieldOfStudy: saved });
    },
  );
});

// ATAR and SAT: test scores apart from Board marks, each asked only where it
// applies.
describe('ATAR and SAT', () => {
  const asked = (profile: Profile, question: Question) => visibleQuestions(profile).has(question);

  it('asks for the ATAR only of a Student living in Australia', () => {
    expect(asked({ countryOfResidence: 'AU' }, 'atar')).toBe(true);
    expect(asked({ countryOfResidence: 'IN' }, 'atar')).toBe(false);
    expect(asked({ countryOfResidence: 'NZ', destination: 'AU' }, 'atar')).toBe(false);
    expect(asked({}, 'atar')).toBe(false);
  });

  it('asks for the SAT score only on the US high-school board or of a Student heading to the US', () => {
    expect(asked({ board: 'us_high_school' }, 'sat')).toBe(true);
    expect(asked({ destination: 'US' }, 'sat')).toBe(true);
    expect(asked({ board: 'cbse', destination: 'US' }, 'sat')).toBe(true);
    expect(asked({ countryOfResidence: 'US' }, 'sat')).toBe(false);
    expect(asked({ board: 'cbse', destination: 'GB' }, 'sat')).toBe(false);
    expect(asked({}, 'sat')).toBe(false);
  });

  it('clears the ATAR when the Student leaves Australia', () => {
    expect(
      applyChange({ countryOfResidence: 'AU', atar: 95.5 }, { countryOfResidence: 'NZ' }),
    ).toEqual({ countryOfResidence: 'NZ' });
    expect(applyChange({ countryOfResidence: 'AU', atar: 95.5 }, { class: 12 })).toEqual({
      countryOfResidence: 'AU',
      atar: 95.5,
      class: 12,
    });
  });

  it('clears the SAT score once neither the board nor the destination asks for it', () => {
    expect(applyChange({ destination: 'US', sat: 1400 }, { destination: 'CA' })).toEqual({
      destination: 'CA',
    });
    expect(applyChange({ board: 'us_high_school', sat: 1400 }, { board: 'ib' })).toEqual({
      board: 'ib',
    });
    expect(
      applyChange({ board: 'us_high_school', destination: 'US', sat: 1400 }, { board: 'ib' }),
    ).toEqual({ board: 'ib', destination: 'US', sat: 1400 });
  });

  it('refuses an ATAR outside 0 to 99.95', () => {
    expect(checkAnswer('atar', 0)).toBeUndefined();
    expect(checkAnswer('atar', 99.95)).toBeUndefined();
    expect(checkAnswer('atar', 99.96)).toBe('Enter an ATAR from 0 to 99.95.');
    expect(checkAnswer('atar', -1)).toBe('Enter an ATAR from 0 to 99.95.');
    expect(checkAnswer('atar', Number.NaN)).toBe('Enter an ATAR from 0 to 99.95.');
  });

  it('refuses a SAT score outside 400 to 1600', () => {
    expect(checkAnswer('sat', 400)).toBeUndefined();
    expect(checkAnswer('sat', 1600)).toBeUndefined();
    expect(checkAnswer('sat', 399)).toBe('Enter a SAT score from 400 to 1600.');
    expect(checkAnswer('sat', 1610)).toBe('Enter a SAT score from 400 to 1600.');
  });
});
