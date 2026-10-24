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
  class10Marks: { op: 'gte', changeable: true },
  latestMarks: { op: 'gte', changeable: true },
  incomeBand: { op: 'lte', changeable: false },
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
  // Replaced by homeState: only Criteria stored before it existed use it,
  // and extraction no longer writes it (see REPLACED_FIELDS).
  domicileState: { op: 'in', changeable: false },
  schoolState: { op: 'in', changeable: false },
  schoolType: { op: 'in', changeable: false },
  board: { op: 'in', changeable: false },
  stream: { op: 'in', changeable: false },
  fieldOfStudy: { op: 'in', changeable: false },
  destination: { op: 'in', changeable: false },
  parentOccupation: { op: 'in', changeable: false },
  examsQualified: { op: 'in', changeable: false },
};

// Fields a Criterion stored earlier may still check, but which extraction
// no longer asks for: the Matcher still judges them, the LLM is not asked.
export const REPLACED_FIELDS: readonly string[] = ['domicileState'];
