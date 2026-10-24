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

// The scales a Board marks result can be given on (frontend copy:
// RESULT_SCALES in frontend/src/app/profile-fields.ts). Results on different
// scales are never compared.
export type ResultScale = 'percentage';

// A Board marks result: a value on its Result scale. A Criterion on a Board
// marks field holds its threshold in the same shape.
export interface BoardResult {
  scale: ResultScale;
  value: number;
}

export interface Profile {
  class?: 9 | 10 | 11 | 12;
  domicileState?: IndianState;
  schoolState?: IndianState;
  schoolType?: 'government' | 'aided' | 'private';
  citizenship?: 'indian' | 'other';
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
