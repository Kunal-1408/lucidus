import type { Criterion } from './scholarship.schema.js';

// Every Profile field a Criterion can check, with the op it compares by and
// whether the Student can still come to meet it. The code sets these for
// every Criterion, wherever its value was read: a regex rule, the LLM, a
// structured JSON field or a reviewer's Override.
export const CRITERION_FIELDS: Record<
  string,
  { op: Criterion['op']; changeable: boolean }
> = {
  class: { op: 'in', changeable: true },
  // Board marks: the value is a result on its Result scale.
  class10Result: { op: 'gte', changeable: true },
  class12Result: { op: 'gte', changeable: true },
  // Test scores apart from Board marks: a minimum ATAR, a minimum SAT score.
  atar: { op: 'gte', changeable: true },
  sat: { op: 'gte', changeable: true },
  incomeBand: { op: 'lte', changeable: false },
  // Family income abroad: the value is an income limit with its currency
  // and period.
  incomeAmount: { op: 'lte', changeable: false },
  gender: { op: 'eq', changeable: false },
  category: { op: 'in', changeable: false },
  minority: { op: 'eq', changeable: false },
  disability: { op: 'eq', changeable: false },
  singleGirlChild: { op: 'eq', changeable: false },
  citizenship: { op: 'in', changeable: false },
  countryOfResidence: { op: 'in', changeable: false },
  region: { op: 'in', changeable: false },
  homeState: { op: 'in', changeable: false },
  residenceStatus: { op: 'in', changeable: false },
  citizenshipCountry: { op: 'in', changeable: false },
  schoolType: { op: 'in', changeable: false },
  board: { op: 'in', changeable: false },
  stream: { op: 'in', changeable: false },
  fieldOfStudy: { op: 'in', changeable: false },
  destination: { op: 'in', changeable: false },
  // Home-student awards (true: the Student studies in the country they live
  // in) and international-student awards (false). No Profile answer holds
  // it: the Matcher compares destination with country of residence.
  destinationIsResidence: { op: 'eq', changeable: false },
  parentOccupation: { op: 'in', changeable: false },
  examsQualified: { op: 'in', changeable: false },
};

// The Board marks fields: each holds a result on its Result scale (frontend
// copy: BOARD_MARKS_FIELDS in frontend/src/app/profile-rules.ts).
export const BOARD_MARKS_FIELDS = ['class10Result', 'class12Result'] as const;
export type BoardMarksField = (typeof BOARD_MARKS_FIELDS)[number];

export function isBoardMarksField(field: string): field is BoardMarksField {
  return (BOARD_MARKS_FIELDS as readonly string[]).includes(field);
}

// Whether a Criterion can check this field; stored Criteria and Overrides
// may still name a field since removed.
export function isCriterionField(field: string): boolean {
  return Object.hasOwn(CRITERION_FIELDS, field);
}

// The fields extraction (rules, the LLM, JSON sources) reads Criteria for.
export const EXTRACTED_FIELDS = Object.keys(CRITERION_FIELDS);
