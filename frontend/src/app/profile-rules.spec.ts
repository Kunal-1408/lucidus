import { Profile } from './profile-fields';
import {
  applyChange,
  boardMarksLabel,
  checkAnswer,
  incomeCurrency,
  findSubjects,
  migrateSavedProfile,
  profileForMatch,
  Question,
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

  it('sends the Home state as the school state fallback for a Student in India', () => {
    expect(profileForMatch({ countryOfResidence: 'IN', region: 'IN-KL' })).toEqual({
      countryOfResidence: 'IN',
      region: 'IN-KL',
      schoolState: 'kerala',
    });
  });

  it('sends no school state fallback for a Student abroad, whose school is not in India', () => {
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

describe('migrateSavedProfile: Home state', () => {
  it('turns a saved domicile state into India and its region, so the same Home state', () => {
    expect(migrateSavedProfile({ domicileState: 'kerala', gender: 'female' })).toEqual({
      countryOfResidence: 'IN',
      region: 'IN-KL',
      gender: 'female',
    });
    expect(migrateSavedProfile({ domicileState: 'odisha' })).toEqual({
      countryOfResidence: 'IN',
      region: 'IN-OD',
    });
  });

  it('keeps a country already given and drops the domicile state', () => {
    expect(migrateSavedProfile({ countryOfResidence: 'AE', domicileState: 'kerala' })).toEqual({
      countryOfResidence: 'AE',
    });
  });

  it('drops a domicile state that is no Indian state', () => {
    expect(migrateSavedProfile({ domicileState: 'atlantis' })).toEqual({});
  });

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
  it.each([
    ['india', 'IN'],
    ['uk', 'GB'],
    ['usa', 'US'],
    ['canada', 'CA'],
    ['australia', 'AU'],
    ['germany', 'DE'],
  ])('turns a saved destination of %s into %s', (saved, code) => {
    expect(migrateSavedProfile({ destination: saved })).toEqual({ destination: code });
  });

  it('drops a saved destination of other, which named no country', () => {
    expect(migrateSavedProfile({ destination: 'other', gender: 'male' })).toEqual({
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
