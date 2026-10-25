// The Profile and the spec's fixed lists for every field, with the labels a Student
// sees. Values match backend/src/match/profile.ts (duplicated on purpose).

export const CLASSES = [
  { value: 9, label: 'Class 9' },
  { value: 10, label: 'Class 10' },
  { value: 11, label: 'Class 11' },
  { value: 12, label: 'Class 12' },
] as const;

export const STATES = [
  { value: 'andhra_pradesh', label: 'Andhra Pradesh' },
  { value: 'arunachal_pradesh', label: 'Arunachal Pradesh' },
  { value: 'assam', label: 'Assam' },
  { value: 'bihar', label: 'Bihar' },
  { value: 'chhattisgarh', label: 'Chhattisgarh' },
  { value: 'goa', label: 'Goa' },
  { value: 'gujarat', label: 'Gujarat' },
  { value: 'haryana', label: 'Haryana' },
  { value: 'himachal_pradesh', label: 'Himachal Pradesh' },
  { value: 'jharkhand', label: 'Jharkhand' },
  { value: 'karnataka', label: 'Karnataka' },
  { value: 'kerala', label: 'Kerala' },
  { value: 'madhya_pradesh', label: 'Madhya Pradesh' },
  { value: 'maharashtra', label: 'Maharashtra' },
  { value: 'manipur', label: 'Manipur' },
  { value: 'meghalaya', label: 'Meghalaya' },
  { value: 'mizoram', label: 'Mizoram' },
  { value: 'nagaland', label: 'Nagaland' },
  { value: 'odisha', label: 'Odisha' },
  { value: 'punjab', label: 'Punjab' },
  { value: 'rajasthan', label: 'Rajasthan' },
  { value: 'sikkim', label: 'Sikkim' },
  { value: 'tamil_nadu', label: 'Tamil Nadu' },
  { value: 'telangana', label: 'Telangana' },
  { value: 'tripura', label: 'Tripura' },
  { value: 'uttar_pradesh', label: 'Uttar Pradesh' },
  { value: 'uttarakhand', label: 'Uttarakhand' },
  { value: 'west_bengal', label: 'West Bengal' },
  { value: 'andaman_and_nicobar_islands', label: 'Andaman and Nicobar Islands (UT)' },
  { value: 'chandigarh', label: 'Chandigarh (UT)' },
  {
    value: 'dadra_and_nagar_haveli_and_daman_and_diu',
    label: 'Dadra and Nagar Haveli and Daman and Diu (UT)',
  },
  { value: 'delhi', label: 'Delhi (UT)' },
  { value: 'jammu_and_kashmir', label: 'Jammu and Kashmir (UT)' },
  { value: 'ladakh', label: 'Ladakh (UT)' },
  { value: 'lakshadweep', label: 'Lakshadweep (UT)' },
  { value: 'puducherry', label: 'Puducherry (UT)' },
] as const;

// Each Indian state's ISO 3166-2 region: for a Student living in India, the
// region they live in is their Home state.
export const STATE_REGIONS: Record<ValueOf<typeof STATES>, string> = {
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

export const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
] as const;

export const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'sc', label: 'SC' },
  { value: 'st', label: 'ST' },
  { value: 'obc', label: 'OBC' },
  { value: 'ews', label: 'EWS' },
  { value: 'ebc', label: 'EBC' },
  { value: 'dnt', label: 'DNT' },
] as const;

export const INCOME_BANDS = [
  { value: 'under_1l', label: 'Under ₹1 lakh' },
  { value: '1l_2l', label: '₹1–2 lakh' },
  { value: '2l_2_5l', label: '₹2–2.5 lakh' },
  { value: '2_5l_3l', label: '₹2.5–3 lakh' },
  { value: '3l_4_5l', label: '₹3–4.5 lakh' },
  { value: '4_5l_6l', label: '₹4.5–6 lakh' },
  { value: '6l_8l', label: '₹6–8 lakh' },
  { value: 'over_8l', label: 'Over ₹8 lakh' },
] as const;

export const SCHOOL_TYPES = [
  { value: 'government', label: 'Government' },
  { value: 'aided', label: 'Government-aided' },
  { value: 'private', label: 'Private' },
] as const;

// An NRI is an Indian citizen living outside India, never a Citizenship.
export const CITIZENSHIPS = [
  { value: 'indian', label: 'Indian citizen' },
  { value: 'oci', label: 'OCI card holder' },
  { value: 'other', label: 'Another nationality' },
] as const;

// Asked only of a Student living outside India, about that country.
export const RESIDENCE_STATUSES = [
  { value: 'citizen', label: 'Citizen of that country' },
  { value: 'permanent_resident', label: 'Permanent resident' },
  { value: 'visa', label: 'On a visa' },
] as const;

export const BOARDS = [
  { value: 'cbse', label: 'CBSE' },
  { value: 'cisce', label: 'CISCE (ICSE / ISC)' },
  { value: 'state', label: 'State board' },
  { value: 'cambridge', label: 'Cambridge/UK' },
  { value: 'ib', label: 'IB' },
  { value: 'us_high_school', label: 'US high school' },
  { value: 'other', label: 'Other' },
] as const;

// The scales a Board marks result can be given on. Results on different
// scales are never compared.
export const RESULT_SCALES = [{ value: 'percentage', label: 'Percentage' }] as const;

export const STREAMS = [
  { value: 'science', label: 'Science' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'arts', label: 'Arts' },
  { value: 'not_chosen', label: 'Not chosen yet' },
] as const;

// The Field of study groups every subject belongs to (SUBJECTS in
// subjects.ts); a subject the Student types belongs to other. science and
// arts keep the values saved Profiles and stored Criteria already use.
export const FIELDS_OF_STUDY = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'medicine', label: 'Medicine and health' },
  { value: 'science', label: 'Natural sciences' },
  { value: 'computing', label: 'Computing' },
  { value: 'commerce', label: 'Commerce and business' },
  { value: 'law', label: 'Law' },
  { value: 'arts', label: 'Arts and humanities' },
  { value: 'social_sciences', label: 'Social sciences' },
  { value: 'design', label: 'Design and architecture' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
] as const;

export type FieldOfStudyGroup = ValueOf<typeof FIELDS_OF_STUDY>;

export const PARENT_OCCUPATIONS = [
  { value: 'defence', label: 'Defence or ex-servicemen' },
  { value: 'central_armed_police', label: 'Central armed police' },
  // { value: 'construction_worker', label: 'Construction worker' },
  // { value: 'beedi_cine_mine_worker', label: 'Beedi, cine or mine worker' },
  { value: 'none', label: 'None of these' },
] as const;

export const EXAMS = [
  { value: 'nmms', label: 'NMMS' },
  { value: 'olympiad', label: 'Olympiad' },
  { value: 'other', label: 'Other' },
] as const;

type ValueOf<T extends readonly { value: unknown }[]> = T[number]['value'];

export type ResultScale = ValueOf<typeof RESULT_SCALES>;

// A Board marks result: a value on its Result scale.
export interface BoardResult {
  scale: ResultScale;
  value: number;
}

// Family income abroad: a yearly amount in an ISO 4217 currency
// (CURRENCIES in currencies.ts). Incomes in different currencies are never
// compared (backend copy: IncomeAmount in backend/src/match/profile.ts).
export interface IncomeAmount {
  currency: string;
  value: number;
}

// What a Student tells us about themselves. Every field is optional.
export interface Profile {
  class?: ValueOf<typeof CLASSES>;
  // Where the Student lives and who they are: an ISO 3166-1 alpha-2 country
  // (COUNTRIES in countries.ts) and an ISO 3166-2 region of it; Home state
  // and Residence status only abroad (in India the region is the Home
  // state); a Citizenship country only for another nationality.
  countryOfResidence?: string;
  region?: string;
  homeState?: ValueOf<typeof STATES>;
  residenceStatus?: ValueOf<typeof RESIDENCE_STATUSES>;
  citizenshipCountry?: string;
  // Replaced by country of residence, region and Home state (a saved one is
  // migrated on load); kept until the old fields are removed.
  domicileState?: ValueOf<typeof STATES>;
  schoolState?: ValueOf<typeof STATES>;
  schoolType?: ValueOf<typeof SCHOOL_TYPES>;
  citizenship?: ValueOf<typeof CITIZENSHIPS>;
  board?: ValueOf<typeof BOARDS>;
  boardsUpcoming?: boolean;
  class10Result?: BoardResult;
  class12Result?: BoardResult;
  stream?: ValueOf<typeof STREAMS>;
  fieldOfStudy?: FieldOfStudyGroup;
  // The subject the Student picked from SUBJECTS or typed (then the group is
  // other). Kept on this device only: a Match request sends the group.
  subject?: string;
  // Where the Student wants to study: an ISO 3166-1 alpha-2 country
  // (COUNTRIES in countries.ts).
  destination?: string;
  incomeBand?: ValueOf<typeof INCOME_BANDS>;
  // Only for a Student living outside India, who gives an amount in place of
  // a rupee band.
  incomeAmount?: IncomeAmount;
  gender?: ValueOf<typeof GENDERS>;
  category?: ValueOf<typeof CATEGORIES>;
  minority?: boolean;
  disability?: boolean;
  singleGirlChild?: boolean;
  parentOccupation?: ValueOf<typeof PARENT_OCCUPATIONS>[];
  examsQualified?: ValueOf<typeof EXAMS>[];
}
