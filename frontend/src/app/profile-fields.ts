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

export const CITIZENSHIPS = [
  { value: 'indian', label: 'Indian' },
  { value: 'other', label: 'Other' },
] as const;

export const BOARDS = [
  { value: 'cbse', label: 'CBSE' },
  { value: 'cisce', label: 'CISCE (ICSE / ISC)' },
  { value: 'state', label: 'State board' },
  { value: 'ib', label: 'IB' },
  { value: 'cambridge', label: 'Cambridge' },
  { value: 'other', label: 'Other' },
] as const;

export const STREAMS = [
  { value: 'science', label: 'Science' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'arts', label: 'Arts' },
  { value: 'not_chosen', label: 'Not chosen yet' },
] as const;

export const FIELDS_OF_STUDY = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'science', label: 'Science' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'arts', label: 'Arts and humanities' },
  { value: 'law', label: 'Law' },
  { value: 'other', label: 'Other' },
] as const;

export const DESTINATIONS = [
  { value: 'india', label: 'India' },
  { value: 'uk', label: 'UK' },
  { value: 'usa', label: 'USA' },
  { value: 'canada', label: 'Canada' },
  { value: 'australia', label: 'Australia' },
  { value: 'germany', label: 'Germany' },
  { value: 'other', label: 'Other' },
] as const;

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

// What a Student tells us about themselves. Every field is optional.
export interface Profile {
  class?: ValueOf<typeof CLASSES>;
  domicileState?: ValueOf<typeof STATES>;
  schoolState?: ValueOf<typeof STATES>;
  schoolType?: ValueOf<typeof SCHOOL_TYPES>;
  citizenship?: ValueOf<typeof CITIZENSHIPS>;
  board?: ValueOf<typeof BOARDS>;
  class10Marks?: number;
  latestMarks?: number;
  boardsUpcoming?: boolean;
  stream?: ValueOf<typeof STREAMS>;
  fieldOfStudy?: ValueOf<typeof FIELDS_OF_STUDY>;
  destination?: ValueOf<typeof DESTINATIONS>;
  incomeBand?: ValueOf<typeof INCOME_BANDS>;
  gender?: ValueOf<typeof GENDERS>;
  category?: ValueOf<typeof CATEGORIES>;
  minority?: boolean;
  disability?: boolean;
  singleGirlChild?: boolean;
  parentOccupation?: ValueOf<typeof PARENT_OCCUPATIONS>[];
  examsQualified?: ValueOf<typeof EXAMS>[];
}
