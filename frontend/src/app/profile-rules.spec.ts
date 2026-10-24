import { Profile } from './profile-fields';
import {
  applyChange,
  checkAnswer,
  migrateProfile,
  profileForMatch,
  Question,
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

  it('sends the Home state as the school state fallback, wherever the Student lives', () => {
    expect(profileForMatch({ countryOfResidence: 'IN', region: 'IN-KL' })).toEqual({
      countryOfResidence: 'IN',
      region: 'IN-KL',
      schoolState: 'kerala',
    });
    expect(profileForMatch({ countryOfResidence: 'AE', homeState: 'goa' })).toEqual({
      countryOfResidence: 'AE',
      homeState: 'goa',
      schoolState: 'goa',
    });
  });
});

describe('migrateProfile', () => {
  it('turns a saved domicile state into India and its region, so the same Home state', () => {
    expect(migrateProfile({ domicileState: 'kerala', gender: 'female' })).toEqual({
      countryOfResidence: 'IN',
      region: 'IN-KL',
      gender: 'female',
    });
    expect(migrateProfile({ domicileState: 'odisha' })).toEqual({
      countryOfResidence: 'IN',
      region: 'IN-OD',
    });
  });

  it('keeps a country already given and drops the domicile state', () => {
    expect(migrateProfile({ countryOfResidence: 'AE', domicileState: 'kerala' })).toEqual({
      countryOfResidence: 'AE',
    });
  });

  it('drops a domicile state that is no Indian state', () => {
    expect(migrateProfile({ domicileState: 'atlantis' } as unknown as Profile)).toEqual({});
  });

  it('keeps Citizenship as it was: Indian stays Indian, other stays other with no country', () => {
    expect(migrateProfile({ citizenship: 'indian' })).toEqual({ citizenship: 'indian' });
    expect(migrateProfile({ citizenship: 'other' })).toEqual({ citizenship: 'other' });
  });

  it('leaves a Profile without old answers as it is', () => {
    const profile: Profile = { countryOfResidence: 'GB', region: 'GB-ENG', class: 11 };
    expect(migrateProfile(profile)).toEqual(profile);
  });
});
