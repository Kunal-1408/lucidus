// The Profile rules: which questions a Student is asked, the answers a change
// clears, and the range each answer must fall in. The profile page only
// renders what these return. The backend applies the same rules to a Match
// request in backend/src/match/profile-input.ts.
import { REGIONS } from './countries';
import { BoardResult, Profile, RESULT_SCALES, STATE_REGIONS, STATES } from './profile-fields';

export type Question = keyof Profile;

const QUESTIONS: readonly Question[] = [
  'class',
  'countryOfResidence',
  'region',
  'homeState',
  'residenceStatus',
  'citizenshipCountry',
  'domicileState',
  'schoolState',
  'schoolType',
  'citizenship',
  'board',
  'boardsUpcoming',
  'class10Result',
  'class12Result',
  'stream',
  'fieldOfStudy',
  'destination',
  'incomeBand',
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
  return new Set(QUESTIONS.filter((question) => !hidden.has(question)));
}

// The Board marks grid: the results a Student's class has sat or is about to
// sit, and the boards-upcoming question only in a class that ends in a board
// exam. Class 10 gets its result once boards are done; a Student who gives
// no class is asked both results and never about boards.
function boardMarksHidden(profile: Profile): Question[] {
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

export type BoardMarksQuestion = 'class10Result' | 'class12Result';

// How a Board marks question is put to the Student: a Class 12 Student whose
// boards are upcoming gives the result they expect.
export function boardMarksLabel(question: BoardMarksQuestion, profile: Profile): string {
  if (question === 'class10Result') return 'Class 10 board result';
  return profile.class === 12 && profile.boardsUpcoming === true
    ? 'Expected Class 12 result (pre-boards or predicted)'
    : 'Class 12 board result';
}

// The Profile after a change: the changed answers applied, and every answer
// to a question the new Profile no longer asks cleared.
export function applyChange(profile: Profile, change: Partial<Profile>): Profile {
  return withoutUnasked(withResidenceClears(profile, change));
}

// Why an answer can't be saved, or undefined when it can. An invalid answer
// is refused, never adjusted to fit.
export function checkAnswer(question: Question, answer: unknown): string | undefined {
  if (question === 'class10Result' || question === 'class12Result') {
    return checkBoardResult(answer);
  }
  return undefined;
}

// The range of each Result scale, with what to tell a Student outside it.
const SCALE_RANGES: Record<BoardResult['scale'], { min: number; max: number; message: string }> = {
  percentage: { min: 0, max: 100, message: 'Enter a percentage from 0 to 100.' },
};

function checkBoardResult(answer: unknown): string | undefined {
  const { scale, value } = (answer ?? {}) as Partial<Record<keyof BoardResult, unknown>>;
  const known = RESULT_SCALES.some((option) => option.value === scale);
  if (!known) return 'Pick the scale your result is given on.';
  const range = SCALE_RANGES[scale as BoardResult['scale']];
  return typeof value === 'number' && value >= range.min && value <= range.max
    ? undefined
    : range.message;
}

// A Profile saved by an earlier version of the form, in today's shape.
export function migrateSavedProfile(saved: Record<string, unknown>): Profile {
  return withHomeState(withBoardMarks(saved)) as Profile;
}

// Latest exam marks meant a different year for each class, so they are
// dropped rather than guessed into a board year; Class 10 marks were always
// a Class 10 percentage.
function withBoardMarks(saved: Record<string, unknown>): Record<string, unknown> {
  const migrated = { ...saved };
  const class10Marks = migrated['class10Marks'];
  if (typeof class10Marks === 'number' && migrated['class10Result'] === undefined) {
    migrated['class10Result'] = { scale: 'percentage', value: class10Marks };
  }
  delete migrated['class10Marks'];
  delete migrated['latestMarks'];
  return migrated;
}

// The Profile as sent inside a Match request: answers to questions it no
// longer asks dropped (a saved Profile may predate a rule), and school state
// falling back to the domicile state.
export function profileForMatch(profile: Profile): Profile {
  const sent = withoutUnasked(withResidenceClears(profile, {}));
  const homeState = sent.domicileState ?? homeStateOf(sent);
  if (homeState !== undefined) sent.schoolState ??= homeState;
  return sent;
}

// Where the Student lives and their Citizenship: the state or region needs a
// country; Home state and Residence status are asked only abroad (in India,
// the region is the Home state); the Citizenship country only of another
// nationality; category of everyone but another nationality.
const INDIA = 'IN';

function unaskedForResidence(profile: Profile): Question[] {
  const unasked: Question[] = [];
  const country = profile.countryOfResidence;
  if (country === undefined) unasked.push('region');
  if (country === undefined || country === INDIA) unasked.push('homeState', 'residenceStatus');
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

// The Home state: the region for a Student in India, the answer abroad.
function homeStateOf(profile: Profile): Profile['homeState'] {
  if (profile.countryOfResidence !== INDIA) return profile.homeState;
  return STATES.find((state) => STATE_REGIONS[state.value] === profile.region)?.value;
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
