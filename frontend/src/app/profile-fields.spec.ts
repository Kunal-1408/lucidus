import { profileForMatch, withoutContradictions } from './profile-fields';

describe('withoutContradictions', () => {
  it('drops single girl child unless the Student is female', () => {
    expect(withoutContradictions({ gender: 'male', singleGirlChild: true })).toEqual({
      gender: 'male',
    });
    expect(withoutContradictions({ gender: 'female', singleGirlChild: true })).toEqual({
      gender: 'female',
      singleGirlChild: true,
    });
  });

  it('drops a stream before Class 11', () => {
    expect(withoutContradictions({ class: 10, stream: 'science' })).toEqual({ class: 10 });
    expect(withoutContradictions({ class: 11, stream: 'science' })).toEqual({
      class: 11,
      stream: 'science',
    });
  });

  it('drops Class 10 board marks for Class 9', () => {
    expect(withoutContradictions({ class: 9, class10Marks: 80 })).toEqual({ class: 9 });
  });
});

describe('profileForMatch', () => {
  it('falls back to the domicile state and drops contradictions', () => {
    expect(
      profileForMatch({ domicileState: 'bihar', gender: 'other', singleGirlChild: true }),
    ).toEqual({ domicileState: 'bihar', schoolState: 'bihar', gender: 'other' });
  });
});
