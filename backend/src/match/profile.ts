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
export type ResultScale = 'percentage';

// A Board marks result: a value on its Result scale. A Criterion on a Board
// marks field holds its threshold in the same shape (frontend copy:
// BoardResult in frontend/src/app/profile-fields.ts).
export interface BoardResult {
  scale: ResultScale;
  value: number;
}

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
export type IncomePeriod = 'monthly' | 'yearly';

// An income limit on a Criterion: at most this amount, in this currency,
// per this period.
export interface IncomeLimit {
  currency: string;
  period: IncomePeriod;
  value: number;
}

// The Field of study groups every subject belongs to; a subject the Student
// types belongs to other (frontend copy: FIELD_OF_STUDY_GROUPS in
// frontend/src/app/profile-fields.ts). science is Natural sciences and arts
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

export interface Profile {
  class?: 9 | 10 | 11 | 12;
  // Where the Student lives and who they are: an ISO 3166-1 alpha-2 country
  // and an ISO 3166-2 region of it (countries.ts); Home state and Residence
  // status only abroad (in India the region is the Home state); a
  // Citizenship country only for another nationality.
  countryOfResidence?: string;
  region?: string;
  homeState?: IndianState;
  residenceStatus?: ResidenceStatus;
  citizenshipCountry?: string;
  // Replaced by country of residence, region and Home state; kept until the
  // old fields are removed.
  domicileState?: IndianState;
  schoolState?: IndianState;
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
  // Readable until ticket 09 removes them: the form no longer sends them.
  class10Marks?: number;
  latestMarks?: number;
  boardsUpcoming?: boolean;
  class10Result?: BoardResult;
  class12Result?: BoardResult;
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
