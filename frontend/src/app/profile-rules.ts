// The Profile rules: which questions a Student is asked, the answers a change
// clears, and the range each answer must fall in. The profile page only
// renders what these return. The backend applies the same rules to a Match
// request in backend/src/match/profile-input.ts.
import { REGIONS } from './countries';
import { Profile, STATE_REGIONS, STATES } from './profile-fields';

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
  'class10Marks',
  'latestMarks',
  'boardsUpcoming',
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
// of a female Student, a stream only from Class 11, Class 10 board marks not
// in Class 9. A question whose deciding answer is not given is asked.
export function visibleQuestions(profile: Profile): ReadonlySet<Question> {
  const hidden = new Set<Question>();
  if (profile.gender !== 'female') hidden.add('singleGirlChild');
  if (profile.class === 9 || profile.class === 10) hidden.add('stream');
  if (profile.class === 9) hidden.add('class10Marks');
  for (const question of unaskedForResidence(profile)) hidden.add(question);
  return new Set(QUESTIONS.filter((question) => !hidden.has(question)));
}

// The Profile after a change: the changed answers applied, and every answer
// to a question the new Profile no longer asks cleared.
export function applyChange(profile: Profile, change: Partial<Profile>): Profile {
  return withoutUnasked(withResidenceClears(profile, change));
}

const PERCENTAGE = 'Enter a percentage from 0 to 100.';

// Why an answer can't be saved, or undefined when it can. An invalid answer
// is refused, never adjusted to fit.
export function checkAnswer(question: Question, answer: unknown): string | undefined {
  if (question === 'class10Marks' || question === 'latestMarks') {
    return typeof answer === 'number' && answer >= 0 && answer <= 100 ? undefined : PERCENTAGE;
  }
  return undefined;
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

// A saved Profile in today's shape. A domicile state becomes India and the
// matching region, which makes it the Home state again.
export function migrateProfile(saved: Profile): Profile {
  return migrateDomicile(saved);
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

function migrateDomicile(saved: Profile): Profile {
  const { domicileState, ...migrated } = saved;
  if (domicileState === undefined || migrated.countryOfResidence !== undefined) return migrated;
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
