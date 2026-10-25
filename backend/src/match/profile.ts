// What a Student tells us about themselves. Every field is optional, and the
// Profile is never stored on the server. The frontend keeps its own copy and
// duplicates these fixed lists (there is no shared types package).

// The 28 states and 8 union territories.
export type IndianState =
  | 'andhra_pradesh'
  | 'arunachal_pradesh'
  | 'assam'
  | 'bihar'
  | 'chhattisgarh'
  | 'goa'
  | 'gujarat'
  | 'haryana'
  | 'himachal_pradesh'
  | 'jharkhand'
  | 'karnataka'
  | 'kerala'
  | 'madhya_pradesh'
  | 'maharashtra'
  | 'manipur'
  | 'meghalaya'
  | 'mizoram'
  | 'nagaland'
  | 'odisha'
  | 'punjab'
  | 'rajasthan'
  | 'sikkim'
  | 'tamil_nadu'
  | 'telangana'
  | 'tripura'
  | 'uttar_pradesh'
  | 'uttarakhand'
  | 'west_bengal'
  | 'andaman_and_nicobar_islands'
  | 'chandigarh'
  | 'dadra_and_nagar_haveli_and_daman_and_diu'
  | 'delhi'
  | 'jammu_and_kashmir'
  | 'ladakh'
  | 'lakshadweep'
  | 'puducherry';

export type ParentOccupation =
  | 'defence'
  | 'central_armed_police'
  | 'construction_worker'
  | 'beedi_cine_mine_worker'
  | 'none';

// Each Indian state's ISO 3166-2 region: for a Student living in India, the
// region they live in is their Home state (frontend copy: STATE_REGIONS in
// frontend/src/app/profile-fields.ts).
export const STATE_REGIONS: Record<IndianState, string> = {
  andhra_pradesh: 'IN-AP',
  arunachal_pradesh: 'IN-AR',
  assam: 'IN-AS',
  bihar: 'IN-BR',
  chhattisgarh: 'IN-CG',
  goa: 'IN-GA',
  gujarat: 'IN-GJ',
  haryana: 'IN-HR',
  himachal_pradesh: 'IN-HP',
  jharkhand: 'IN-JH',
  karnataka: 'IN-KA',
  kerala: 'IN-KL',
  madhya_pradesh: 'IN-MP',
  maharashtra: 'IN-MH',
  manipur: 'IN-MN',
  meghalaya: 'IN-ML',
  mizoram: 'IN-MZ',
  nagaland: 'IN-NL',
  odisha: 'IN-OD',
  punjab: 'IN-PB',
  rajasthan: 'IN-RJ',
  sikkim: 'IN-SK',
  tamil_nadu: 'IN-TN',
  telangana: 'IN-TS',
  tripura: 'IN-TR',
  uttar_pradesh: 'IN-UP',
  uttarakhand: 'IN-UK',
  west_bengal: 'IN-WB',
  andaman_and_nicobar_islands: 'IN-AN',
  chandigarh: 'IN-CH',
  dadra_and_nagar_haveli_and_daman_and_diu: 'IN-DH',
  delhi: 'IN-DL',
  jammu_and_kashmir: 'IN-JK',
  ladakh: 'IN-LA',
  lakshadweep: 'IN-LD',
  puducherry: 'IN-PY',
};

// Frontend copy: RESIDENCE_STATUSES in frontend/src/app/profile-fields.ts.
export type ResidenceStatus = 'citizen' | 'permanent_resident' | 'visa';

// An NRI is an Indian citizen living outside India, never a Citizenship
// (frontend copy: CITIZENSHIPS in frontend/src/app/profile-fields.ts).
export type Citizenship = 'indian' | 'oci' | 'other';

// The scales a Board marks result can be given on (frontend copy:
// RESULT_SCALES in frontend/src/app/profile-fields.ts). Results on different
// scales are never compared.
export type ResultScale =
  'percentage' | 'cgpa_10' | 'gpa_4' | 'ib_points' | 'a_level';

// A-level grades, best first (frontend copy: A_LEVEL_GRADES in
// frontend/src/app/profile-fields.ts).
export const A_LEVEL_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'] as const;
export type ALevelGrade = (typeof A_LEVEL_GRADES)[number];

// A-level grades as a result holds them: one or more, each from A* to E.
export function isALevelGrades(value: unknown): value is ALevelGrade[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((grade) =>
      (A_LEVEL_GRADES as readonly unknown[]).includes(grade),
    )
  );
}

// A Board marks result: a value on its Result scale, a number on every
// scale but A-level grades, which are a list of grades ("A*AB"). A
// Criterion on a Board marks field holds its threshold in the same shape
// (frontend copy: BoardResult in frontend/src/app/profile-fields.ts).
export type BoardResult =
  | { scale: Exclude<ResultScale, 'a_level'>; value: number }
  | { scale: 'a_level'; value: ALevelGrade[] };

// The Result scales each Board marks result may be given on: CGPA only for
// Class 10 (CBSE), the foreign Class 12 equivalents only for Class 12
// (frontend copy: SLOT_SCALES in frontend/src/app/profile-rules.ts).
export const SLOT_SCALES: Record<
  'class10Result' | 'class12Result',
  readonly ResultScale[]
> = {
  class10Result: ['percentage', 'cgpa_10'],
  class12Result: ['percentage', 'gpa_4', 'ib_points', 'a_level'],
};

// The range of each Result scale given as a number; IB points are whole
// numbers too (frontend copy: RESULT_SCALE_RANGES in
// frontend/src/app/profile-rules.ts).
export const RESULT_SCALE_RANGES: Record<
  Exclude<ResultScale, 'a_level'>,
  [min: number, max: number]
> = {
  percentage: [0, 100],
  cgpa_10: [0, 10],
  gpa_4: [0, 4],
  ib_points: [0, 45],
};

// Whether a value is a number inside a range, both ends included.
export function isInRange(
  value: unknown,
  [min, max]: readonly [min: number, max: number],
): value is number {
  return typeof value === 'number' && value >= min && value <= max;
}

// The Profile fields holding a Test score, kept apart from Board marks
// (frontend copy: TestScoreField in frontend/src/app/profile-rules.ts).
export type TestScoreField = 'atar' | 'sat';

// The range of each test score: the ATAR is a rank, the SAT a test score,
// neither a Result scale (frontend copy: TEST_SCORE_RANGES in
// frontend/src/app/profile-rules.ts).
export const TEST_SCORE_RANGES: Record<
  TestScoreField,
  [min: number, max: number]
> = {
  atar: [0, 99.95],
  sat: [400, 1600],
};

// Board narrowing (frontend copies of the same names in
// frontend/src/app/profile-rules.ts): Cambridge/UK, IB and US high school
// have no Class 10 board exam, so no Class 10 result and no boards upcoming
// in Class 10; US high school has no Class 12 board exam either, its GPA
// sits in the Class 12 slot.
export const NO_CLASS_10_EXAM_BOARDS: readonly NonNullable<Profile['board']>[] =
  ['cambridge', 'ib', 'us_high_school'];
export const NO_CLASS_12_EXAM_BOARDS: readonly NonNullable<Profile['board']>[] =
  ['us_high_school'];

// Family income abroad: a yearly amount in an ISO 4217 currency
// (CURRENCIES in currencies.ts). Incomes in different currencies are never
// compared (frontend copy: IncomeAmount in
// frontend/src/app/profile-fields.ts).
export interface IncomeAmount {
  currency: string;
  value: number;
}

// How often an income limit is counted. A monthly limit is compared as
// twelve months.
export const INCOME_PERIODS = ['monthly', 'yearly'] as const;
export type IncomePeriod = (typeof INCOME_PERIODS)[number];

// An income limit on a Criterion: at most this amount, in this currency,
// per this period.
export type IncomeLimit = IncomeAmount & { period: IncomePeriod };

// The Field of study groups every subject belongs to; a subject the Student
// types belongs to other (frontend copy: FieldOfStudyGroup, the values of
// FIELDS_OF_STUDY in frontend/src/app/profile-fields.ts). science is Natural sciences and arts
// is Arts and humanities, keeping the values saved Profiles and stored
// Criteria already use.
export type FieldOfStudyGroup =
  | 'engineering'
  | 'medicine'
  | 'science'
  | 'computing'
  | 'commerce'
  | 'law'
  | 'arts'
  | 'social_sciences'
  | 'design'
  | 'agriculture'
  | 'education'
  | 'other';

// The classes a Student can be in.
export const CLASSES = [9, 10, 11, 12] as const;

export interface Profile {
  class?: (typeof CLASSES)[number];
  // Where the Student lives and who they are: an ISO 3166-1 alpha-2 country
  // and an ISO 3166-2 region of it (countries.ts); Home state and Residence
  // status only abroad (in India the region is the Home state); a
  // Citizenship country only for another nationality.
  countryOfResidence?: string;
  region?: string;
  homeState?: IndianState;
  residenceStatus?: ResidenceStatus;
  citizenshipCountry?: string;
  schoolType?: 'government' | 'aided' | 'private';
  citizenship?: Citizenship;
  board?:
    | 'cbse'
    | 'cisce'
    | 'state'
    | 'cambridge'
    | 'ib'
    | 'us_high_school'
    | 'other';
  boardsUpcoming?: boolean;
  class10Result?: BoardResult;
  class12Result?: BoardResult;
  // Test scores apart from Board marks: the ATAR only for a Student living
  // in Australia, the SAT score only on the US high-school board or for a
  // Student heading to the US (ranges in TEST_SCORE_RANGES).
  atar?: number;
  sat?: number;
  stream?: 'science' | 'commerce' | 'arts' | 'not_chosen';
  // A Field of study group. The subject a Student picks or types stays in
  // the form: Criteria name groups only.
  fieldOfStudy?: FieldOfStudyGroup;
  // Where the Student wants to study: an ISO 3166-1 alpha-2 country.
  destination?: string;
  incomeBand?:
    | 'under_1l'
    | '1l_2l'
    | '2l_2_5l'
    | '2_5l_3l'
    | '3l_4_5l'
    | '4_5l_6l'
    | '6l_8l'
    | 'over_8l';
  // Only for a Student living outside India, who gives an amount in place of
  // a rupee band.
  incomeAmount?: IncomeAmount;
  gender?: 'female' | 'male' | 'other';
  category?: 'general' | 'sc' | 'st' | 'obc' | 'ews' | 'ebc' | 'dnt';
  minority?: boolean;
  disability?: boolean;
  singleGirlChild?: boolean;
  parentOccupation?: ParentOccupation[];
  examsQualified?: ('nmms' | 'olympiad' | 'other')[];
}
