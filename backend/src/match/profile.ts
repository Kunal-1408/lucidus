// What a Student tells us about themselves. Every field is optional, and the
// Profile is never stored on the server. The frontend keeps its own copy.
export interface Profile {
  class?: 9 | 10 | 11 | 12;
  domicileState?: string;
  schoolState?: string;
  schoolType?: 'government' | 'aided' | 'private';
  citizenship?: 'indian' | 'other';
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
  category?: 'general' | 'sc' | 'st' | 'obc' | 'ews';
  minority?: boolean;
  disability?: boolean;
  singleGirlChild?: boolean;
  parentOccupation?: string[];
  examsQualified?: ('nmms' | 'olympiad' | 'other')[];
}
