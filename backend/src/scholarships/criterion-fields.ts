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
  class10Marks: { op: 'gte', changeable: true },
  latestMarks: { op: 'gte', changeable: true },
  incomeBand: { op: 'lte', changeable: false },
  gender: { op: 'eq', changeable: false },
  category: { op: 'in', changeable: false },
  minority: { op: 'eq', changeable: false },
  disability: { op: 'eq', changeable: false },
  singleGirlChild: { op: 'eq', changeable: false },
  citizenship: { op: 'eq', changeable: false },
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

// Fields stored Criteria and Overrides may still name, but that extraction
// no longer produces: Board marks replaced them. Ticket 09 removes them.
export const LEGACY_FIELDS: readonly string[] = ['class10Marks', 'latestMarks'];

// The fields extraction (rules, the LLM, JSON sources) reads Criteria for.
export const EXTRACTED_FIELDS = Object.keys(CRITERION_FIELDS).filter(
  (field) => !LEGACY_FIELDS.includes(field),
);
