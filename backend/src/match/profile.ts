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
// region they live in is their Home state.
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

export type ResidenceStatus = 'citizen' | 'permanent_resident' | 'visa';

// An NRI is an Indian citizen living outside India, never a Citizenship.
export type Citizenship = 'indian' | 'oci' | 'other';

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
  board?: 'cbse' | 'cisce' | 'state' | 'ib' | 'cambridge' | 'other';
  class10Marks?: number;
  latestMarks?: number;
  boardsUpcoming?: boolean;
  stream?: 'science' | 'commerce' | 'arts' | 'not_chosen';
  fieldOfStudy?:
    | 'engineering'
    | 'medicine'
    | 'science'
    | 'commerce'
    | 'arts'
    | 'law'
    | 'other';
  destination?:
    'india' | 'uk' | 'usa' | 'canada' | 'australia' | 'germany' | 'other';
  incomeBand?:
    | 'under_1l'
    | '1l_2l'
    | '2l_2_5l'
    | '2_5l_3l'
    | '3l_4_5l'
    | '4_5l_6l'
    | '6l_8l'
    | 'over_8l';
  gender?: 'female' | 'male' | 'other';
  category?: 'general' | 'sc' | 'st' | 'obc' | 'ews' | 'ebc' | 'dnt';
  minority?: boolean;
  disability?: boolean;
  singleGirlChild?: boolean;
  parentOccupation?: ParentOccupation[];
  examsQualified?: ('nmms' | 'olympiad' | 'other')[];
}
