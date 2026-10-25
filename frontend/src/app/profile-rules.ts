// The Profile rules: which questions a Student is asked, the answers a change
// clears, and the range each answer must fall in. The profile page only
// renders what these return. The backend applies the same rules to a Match
// request in backend/src/match/profile-input.ts.
import { COUNTRIES, INDIA, REGIONS } from './countries';
import { COUNTRY_CURRENCIES, CURRENCIES } from './currencies';
import {
  A_LEVEL_GRADES,
  ALevelGrade,
  BoardResult,
  FIELDS_OF_STUDY,
  IncomeAmount,
  Profile,
  ResultScale,
  STATE_REGIONS,
  STATES,
} from './profile-fields';
import { Subject, SUBJECTS } from './subjects';

export type Question = keyof Profile;

const QUESTIONS: readonly Question[] = [
  'class',
  'countryOfResidence',
  'region',
  'homeState',
  'residenceStatus',
  'citizenshipCountry',
  'schoolType',
  'citizenship',
  'board',
  'boardsUpcoming',
  'class10Result',
  'class12Result',
  'atar',
  'sat',
  'stream',
  'fieldOfStudy',
  'subject',
  'destination',
  'incomeBand',
  'incomeAmount',
  'gender',
  'category',
  'minority',
  'disability',
  'singleGirlChild',
  'parentOccupation',
  'examsQualified',
];

// The questions asked of a Student with this Profile: single girl child only
// of a female Student, a stream only from Class 11, and Board marks by the
// grid (see boardMarksHidden). A question whose deciding answer is not given
// is asked.
export function visibleQuestions(profile: Profile): ReadonlySet<Question> {
  const hidden = new Set<Question>(boardMarksHidden(profile));
  if (profile.gender !== 'female') hidden.add('singleGirlChild');
  if (profile.class === 9 || profile.class === 10) hidden.add('stream');
  for (const question of unaskedForResidence(profile)) hidden.add(question);
  for (const question of unaskedTestScores(profile)) hidden.add(question);
  return new Set(QUESTIONS.filter((question) => !hidden.has(question)));
}

// The ATAR is asked only of a Student living in Australia; the SAT score only
// on the US high-school board or of a Student heading to the US (backend
// copy: testScoreContradictions in backend/src/match/profile-input.ts).
function unaskedTestScores(profile: Profile): Question[] {
  const unasked: Question[] = [];
  if (profile.countryOfResidence !== 'AU') unasked.push('atar');
  if (profile.board !== 'us_high_school' && profile.destination !== 'US') unasked.push('sat');
  return unasked;
}

// The Profile fields holding a Test score (backend copy: TestScoreField in
// backend/src/match/profile.ts).
export type TestScoreField = 'atar' | 'sat';

// The range of each test score (backend copy: TEST_SCORE_RANGES in
// backend/src/match/profile.ts).
export const TEST_SCORE_RANGES: Record<TestScoreField, [min: number, max: number]> = {
  atar: [0, 99.95],
  sat: [400, 1600],
};

const OUT_OF_RANGE_SCORE: Record<TestScoreField, string> = {
  atar: 'Enter an ATAR from 0 to 99.95.',
  sat: 'Enter a SAT score from 400 to 1600.',
};

function checkTestScore(question: TestScoreField, answer: unknown) {
  const [min, max] = TEST_SCORE_RANGES[question];
  const inRange = typeof answer === 'number' && answer >= min && answer <= max;
  return inRange ? undefined : OUT_OF_RANGE_SCORE[question];
}

// The Board marks grid: the results a Student's class has sat or is about to
// sit, and the boards-upcoming question only in a class that ends in a board
// exam. Class 10 gets its result once boards are done; a Student who gives
// no class is asked both results and never about boards. Board narrows it.
function boardMarksHidden(profile: Profile): Question[] {
  return [...gridHidden(profile), ...narrowedByBoard(profile)];
}

function gridHidden(profile: Profile): Question[] {
  switch (profile.class) {
    case 9:
      return ['class10Result', 'class12Result', 'boardsUpcoming'];
    case 10:
      return profile.boardsUpcoming === true
        ? ['class10Result', 'class12Result']
        : ['class12Result'];
    case 11:
      return ['class12Result', 'boardsUpcoming'];
    case 12:
      return [];
    default:
      return ['boardsUpcoming'];
  }
}

// Board narrowing (backend copies of the same names in
// backend/src/match/profile.ts): Cambridge/UK, IB and US high school have no
// Class 10 board exam, so no Class 10 result and no boards upcoming in Class
// 10 (GCSE/IGCSE requirements are Extra requirements); US high school has no
// Class 12 board exam either, its GPA sits in the Class 12 slot.
export const NO_CLASS_10_EXAM_BOARDS: readonly NonNullable<Profile['board']>[] = [
  'cambridge',
  'ib',
  'us_high_school',
];
export const NO_CLASS_12_EXAM_BOARDS: readonly NonNullable<Profile['board']>[] = ['us_high_school'];

function narrowedByBoard({ board, class: level }: Profile): Question[] {
  if (board === undefined) return [];
  const hidden: Question[] = [];
  if (NO_CLASS_10_EXAM_BOARDS.includes(board)) {
    hidden.push('class10Result');
    if (level === 10) hidden.push('boardsUpcoming');
  }
  if (NO_CLASS_12_EXAM_BOARDS.includes(board) && level === 12) hidden.push('boardsUpcoming');
  return hidden;
}

// The Board marks fields (backend copy: BOARD_MARKS_FIELDS in
// backend/src/scholarships/criterion-fields.ts).
export const BOARD_MARKS_FIELDS = ['class10Result', 'class12Result'] as const;
export type BoardMarksQuestion = (typeof BOARD_MARKS_FIELDS)[number];

// The Result scales each Board marks result may be given on: CGPA only for
// Class 10 (CBSE), the foreign Class 12 equivalents only for Class 12
// (backend copy: SLOT_SCALES in backend/src/match/profile.ts).
export const SLOT_SCALES: Record<BoardMarksQuestion, readonly ResultScale[]> = {
  class10Result: ['percentage', 'cgpa_10'],
  class12Result: ['percentage', 'gpa_4', 'ib_points', 'a_level'],
};

// The scale a board presets for its Class 12 result; every other board, and
// every Class 10 result, starts on percentage.
const BOARD_SCALES: Partial<Record<NonNullable<Profile['board']>, ResultScale>> = {
  cambridge: 'a_level',
  ib: 'ib_points',
  us_high_school: 'gpa_4',
};

// The scale a Board marks question is answered on: the one the Student
// picked, else the one their result is on, else the board's preset. A scale
// the question doesn't take is never used.
export function resultScale(
  question: BoardMarksQuestion,
  profile: Profile,
  picked?: ResultScale,
): ResultScale {
  const allowed = SLOT_SCALES[question];
  const preset =
    question === 'class12Result' && profile.board ? BOARD_SCALES[profile.board] : undefined;
  const candidates = [picked, profile[question]?.scale, preset];
  return candidates.find((scale) => scale !== undefined && allowed.includes(scale)) ?? 'percentage';
}

// A result as typed into the form, on the scale it was typed for: A-level
// grades in any case, with or without spaces ("a*ab", "A* A B"); a number on
// every other scale. Undefined when nothing was typed. checkAnswer says
// whether it can be saved.
export function readResult(scale: ResultScale, typed: string): BoardResult | undefined {
  const text = typed.trim();
  if (text === '') return undefined;
  if (scale === 'a_level') {
    const grades =
      text
        .toUpperCase()
        .replace(/[\s,]/g, '')
        .match(/[A-Z]\*?|./g) ?? [];
    return { scale, value: grades as ALevelGrade[] };
  }
  return { scale, value: Number(text) };
}

// How a result is shown back in its field.
export function shownResult(result: BoardResult | undefined): string | number {
  if (result === undefined) return '';
  return result.scale === 'a_level' ? result.value.join('') : result.value;
}

// How a Board marks question is put to the Student, on the scale it is
// answered on (the one picked, else resultScale's): a Class 12 result reads
// as the result that scale gives (a US Student's GPA is a high-school GPA,
// not Class 12 marks), and a Class 12 Student whose boards are upcoming gives
// the result they expect.
const CLASS_12_LABELS: Record<ResultScale, { done: string; upcoming: string }> = {
  percentage: {
    done: 'Class 12 board result',
    upcoming: 'Expected Class 12 result (pre-boards or predicted)',
  },
  cgpa_10: {
    done: 'Class 12 board result',
    upcoming: 'Expected Class 12 result (pre-boards or predicted)',
  },
  gpa_4: { done: 'High-school GPA', upcoming: 'High-school GPA' },
  ib_points: { done: 'IB Diploma points', upcoming: 'Predicted IB Diploma points' },
  a_level: { done: 'A-level grades', upcoming: 'Predicted A-level grades' },
};

export function boardMarksLabel(
  question: BoardMarksQuestion,
  profile: Profile,
  scale: ResultScale = resultScale(question, profile),
): string {
  if (question === 'class10Result') return 'Class 10 board result';
  const labels = CLASS_12_LABELS[scale];
  return profile.class === 12 && profile.boardsUpcoming === true ? labels.upcoming : labels.done;
}

// The Profile after a change: the changed answers applied, and every answer
// to a question the new Profile no longer asks cleared.
export function applyChange(profile: Profile, change: Partial<Profile>): Profile {
  return withoutUnasked(
    withSubjectClears(withBoardClears(profile, withResidenceClears(profile, change), change)),
  );
}

// The Profile after the Student picks a scale for a Board marks question: a
// result on another scale is cleared, so it is never read on the new one.
export function applyScaleChange(
  profile: Profile,
  question: BoardMarksQuestion,
  scale: ResultScale,
): Profile {
  if (profile[question] === undefined || profile[question].scale === scale) return profile;
  const { [question]: _cleared, ...kept } = profile;
  return kept;
}

// A change of board clears both results, unless the change gives them again,
// so a result is never read on the board's new scale (a change of scale is
// applyScaleChange).
function withBoardClears(before: Profile, next: Profile, change: Partial<Profile>): Profile {
  if (!('board' in change) || change.board === before.board) return next;
  const cleared = { ...next };
  for (const question of BOARD_MARKS_FIELDS) {
    if (!(question in change)) delete cleared[question];
  }
  return cleared;
}

// The subjects whose name holds the query, ignoring case.
export function findSubjects(query: string): readonly Subject[] {
  const wanted = query.trim().toLowerCase();
  return SUBJECTS.filter((subject) => subject.label.toLowerCase().includes(wanted));
}

// The answer for a subject the Student picked or typed: a listed subject
// with its group, any other with the group Other; an empty one clears the
// subject and keeps the group.
export function subjectAnswer(text: string): Partial<Profile> {
  const typed = text.trim();
  if (typed === '') return { subject: undefined };
  const listed = listedSubject(typed);
  return listed
    ? { fieldOfStudy: listed.group, subject: listed.label }
    : { fieldOfStudy: 'other', subject: typed };
}

// How the Student's subject is used, shown back beside it.
export function subjectNote(profile: Profile): string | undefined {
  const { subject } = profile;
  if (subject === undefined) return undefined;
  const listed = listedSubject(subject);
  if (!listed) return `"${subject}" is not on our list, so it is counted as Other.`;
  const group = FIELDS_OF_STUDY.find((option) => option.value === listed.group);
  return `Counted as ${group?.label}.`;
}

function listedSubject(text: string): Subject | undefined {
  const wanted = text.toLowerCase();
  return SUBJECTS.find((subject) => subject.label.toLowerCase() === wanted);
}

// A subject is kept only in its own group: a listed one in the group it
// belongs to, a typed one in Other.
function withSubjectClears(profile: Profile): Profile {
  if (profile.subject === undefined) return profile;
  const group = listedSubject(profile.subject)?.group ?? 'other';
  if (group === profile.fieldOfStudy) return profile;
  const { subject: _cleared, ...kept } = profile;
  return kept;
}

// Why an answer can't be saved, or undefined when it can. An invalid answer
// is refused, never adjusted to fit.
export function checkAnswer(question: Question, answer: unknown): string | undefined {
  if ((BOARD_MARKS_FIELDS as readonly Question[]).includes(question)) {
    return checkBoardResult(question as BoardMarksQuestion, answer);
  }
  if (question === 'incomeAmount') return checkIncomeAmount(answer);
  if (question === 'atar' || question === 'sat') return checkTestScore(question, answer);
  return undefined;
}

function checkIncomeAmount(answer: unknown): string | undefined {
  const { currency, value } = (answer ?? {}) as Partial<Record<keyof IncomeAmount, unknown>>;
  if (!CURRENCIES.some((option) => option.value === currency)) {
    return 'Pick the currency your family income is in.';
  }
  return typeof value === 'number' && value >= 0 ? undefined : 'Enter an amount of 0 or more.';
}

// The currency the family income question offers: the one the Student gave,
// else their country's own. A country with no currency of its own offers
// none.
export function incomeCurrency(profile: Profile): string | undefined {
  return profile.incomeAmount?.currency ?? COUNTRY_CURRENCIES[profile.countryOfResidence ?? ''];
}

// The range of each Result scale given as a number; IB points are whole
// numbers too (backend copy: RESULT_SCALE_RANGES in
// backend/src/match/profile.ts).
export const RESULT_SCALE_RANGES: Record<
  Exclude<ResultScale, 'a_level'>,
  [min: number, max: number]
> = {
  percentage: [0, 100],
  cgpa_10: [0, 10],
  gpa_4: [0, 4],
  ib_points: [0, 45],
};

// What to tell a Student whose result is outside its scale.
const OUT_OF_SCALE: Record<ResultScale, string> = {
  percentage: 'Enter a percentage from 0 to 100.',
  cgpa_10: 'Enter a CGPA from 0 to 10.',
  gpa_4: 'Enter a GPA from 0 to 4.',
  ib_points: 'Enter whole IB points from 0 to 45.',
  a_level: 'Enter A-level grades from A* to E, such as A*AB.',
};

// A result on a scale its question takes, inside that scale (backend copy:
// boardResult in backend/src/match/profile-input.ts).
function checkBoardResult(question: BoardMarksQuestion, answer: unknown): string | undefined {
  const { scale, value } = (answer ?? {}) as { scale?: unknown; value?: unknown };
  const allowed = SLOT_SCALES[question] as readonly unknown[];
  if (!allowed.includes(scale)) return 'Pick the scale your result is given on.';
  const known = scale as ResultScale;
  return isOnScale(known, value) ? undefined : OUT_OF_SCALE[known];
}

function isOnScale(scale: ResultScale, value: unknown): boolean {
  if (scale === 'a_level') {
    const grades = A_LEVEL_GRADES as readonly unknown[];
    return Array.isArray(value) && value.length > 0 && value.every((g) => grades.includes(g));
  }
  const [min, max] = RESULT_SCALE_RANGES[scale];
  const inRange = typeof value === 'number' && value >= min && value <= max;
  return inRange && (scale !== 'ib_points' || Number.isInteger(value));
}

// A Profile saved by an earlier version of the form, in today's shape. The
// old answers' keys live only here: whatever they don't carry over, like any
// other answer to a question the form no longer has, is dropped.
export function migrateSavedProfile(saved: Record<string, unknown>): Profile {
  const migrated = withDestinationCode(withHomeState(withClass10Result(saved)));
  return Object.fromEntries(
    Object.entries(migrated).filter(([question]) => QUESTIONS.includes(question as Question)),
  ) as Profile;
}

// The destinations the form offered before every country, with the code each
// now is.
const OLD_DESTINATIONS: Record<string, string> = {
  india: 'IN',
  uk: 'GB',
  usa: 'US',
  canada: 'CA',
  australia: 'AU',
  germany: 'DE',
};

// A saved destination becomes its country code; "other" named no country and
// is dropped. Saved fields of study already are their groups' values.
function withDestinationCode(saved: Record<string, unknown>): Record<string, unknown> {
  const { destination, ...migrated } = saved;
  if (typeof destination !== 'string') return migrated;
  const code = Object.hasOwn(OLD_DESTINATIONS, destination)
    ? OLD_DESTINATIONS[destination]
    : destination;
  return COUNTRIES.some((country) => country.value === code)
    ? { ...migrated, destination: code }
    : migrated;
}

// Class 10 marks were always a Class 10 percentage; latest exam marks meant a
// different year for each class, so they are dropped rather than guessed into
// a board year.
function withClass10Result(saved: Record<string, unknown>): Record<string, unknown> {
  const { class10Marks, ...migrated } = saved;
  if (typeof class10Marks === 'number' && migrated['class10Result'] === undefined) {
    migrated['class10Result'] = { scale: 'percentage', value: class10Marks };
  }
  return migrated;
}

// A saved domicile state becomes India and the matching region, which makes
// it the Home state again; one that is no Indian state, or given beside a
// country, is dropped.
function withHomeState(saved: Record<string, unknown>): Record<string, unknown> {
  const { domicileState, ...migrated } = saved;
  if (domicileState === undefined || migrated['countryOfResidence'] !== undefined) return migrated;
  const state = STATES.find((s) => s.value === domicileState);
  if (state === undefined) return migrated;
  return { countryOfResidence: INDIA, region: STATE_REGIONS[state.value], ...migrated };
}

// The Profile as sent inside a Match request: answers to questions it no
// longer asks dropped (a saved Profile may predate a rule), and the subject
// left out (Criteria name groups only).
export function profileForMatch(profile: Profile): Profile {
  const { subject: _subject, ...asked } = profile;
  return withoutUnasked(withResidenceClears(asked, {}));
}

// Where the Student lives and their Citizenship: the state or region needs a
// country; Home state, Residence status and a family income amount are asked
// only abroad (in India, the region is the Home state and income is a rupee
// band, as it is for a Student who gives no country); the Citizenship
// country only of another nationality; category of everyone but another
// nationality.

function unaskedForResidence(profile: Profile): Question[] {
  const unasked: Question[] = [];
  const country = profile.countryOfResidence;
  if (country === undefined) unasked.push('region');
  if (country === undefined || country === INDIA) {
    unasked.push('homeState', 'residenceStatus', 'incomeAmount');
  } else {
    unasked.push('incomeBand');
  }
  if (profile.citizenship !== 'other') unasked.push('citizenshipCountry');
  else unasked.push('category');
  return unasked;
}

// A change of country clears the answers given about the old one, unless the
// change gives them again; a region is kept only when it is one of the
// country's.
function withResidenceClears(profile: Profile, change: Partial<Profile>): Profile {
  const next: Profile = { ...profile, ...change };
  if ('countryOfResidence' in change && change.countryOfResidence !== profile.countryOfResidence) {
    for (const question of ['region', 'homeState', 'residenceStatus'] as const) {
      if (!(question in change)) delete next[question];
    }
  }
  if (next.region !== undefined && !isRegionOf(next.region, next.countryOfResidence)) {
    delete next.region;
  }
  return next;
}

function isRegionOf(region: string, country: string | undefined): boolean {
  return country !== undefined && (REGIONS[country] ?? []).some((r) => r.value === region);
}

// Clearing one answer can hide another question in turn, so this repeats
// until nothing more is cleared.
function withoutUnasked(profile: Profile): Profile {
  let current = profile;
  for (;;) {
    const asked = visibleQuestions(current);
    const kept = Object.fromEntries(
      Object.entries(current).filter(
        ([question, answer]) => answer !== undefined && asked.has(question as Question),
      ),
    ) as Profile;
    if (Object.keys(kept).length === Object.keys(current).length) return kept;
    current = kept;
  }
}
