// The Profile rules: which questions a Student is asked, the answers a change
// clears, and the range each answer must fall in. The profile page only
// renders what these return. The backend applies the same rules to a Match
// request in backend/src/match/profile-input.ts.
import { Profile } from './profile-fields';

export type Question = keyof Profile;

const QUESTIONS: readonly Question[] = [
  'class',
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
  return new Set(QUESTIONS.filter((question) => !hidden.has(question)));
}

// The Profile after a change: the changed answers applied, and every answer
// to a question the new Profile no longer asks cleared.
export function applyChange(profile: Profile, change: Partial<Profile>): Profile {
  return withoutUnasked({ ...profile, ...change });
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
  const sent = withoutUnasked(profile);
  if (sent.domicileState !== undefined) sent.schoolState ??= sent.domicileState;
  return sent;
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
