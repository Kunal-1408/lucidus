import { CRITERION_FIELDS } from '../scholarships/criterion-fields.js';
import type {
  Criterion,
  ExtraRequirement,
} from '../scholarships/scholarship.schema.js';
import { DATE, MONEY, STATE_NAMES, toClass } from './normalise.js';

// What a rule found, before normalisation: the raw value as the source
// wrote it ("₹3,50,000/-", "IX", "Andhra Pradesh") and its sentence.
export interface Found {
  field: string;
  op: Criterion['op'];
  raw: string | string[];
  changeable: boolean;
  sourceText: string;
}

export type FieldRule = (sentences: string[]) => Found | undefined;

// The sentence filter: eligibility words, plus every keyword rule's words
// (see isEligibilitySentence below).
const ELIGIBILITY_WORDS =
  /eligib|girls?\b|boys?\b|women|female|\bmale\b|class|grade|standard|income|category|marks|%|studying|school/i;

// Op and changeability come from the field, as for every Criterion.
function found(
  field: string,
  raw: string | string[],
  sourceText: string,
): Found {
  return { field, raw, sourceText, ...CRITERION_FIELDS[field] };
}

const FEMALE = /\b(girls?|women|female|daughters?)\b/i;
const MALE = /\b(boys?|male|sons?)\b/i;

// A source naming only girls (or only boys) gets a gender Criterion; one
// naming both, or neither, gets none.
const genderRule: FieldRule = (sentences) => {
  const female = sentences.find((s) => FEMALE.test(s));
  const male = sentences.find((s) => MALE.test(s));
  if (female && !male) return found('gender', 'female', female);
  if (male && !female) return found('gender', 'male', male);
  return undefined;
};

const CLASS_MENTION =
  /\b(?:class|grade|std\.?|standard)\s*(9|10|11|12|ix|x|xi|xii)(?:th)?\b/gi;
const LEVEL = String.raw`(\d{1,2}|ix|x|xi|xii)(?:st|nd|rd|th)?`;
// "Class 9-12", "classes 9th to 12th", "standard IX to XII".
const CLASS_RANGE = new RegExp(
  String.raw`\b(?:class(?:es)?|grades?|std\.?|standards?)\s*${LEVEL}\s*(?:to|-|–)\s*(?:class\s*)?${LEVEL}\b`,
  'i',
);
// "from Class 9 onwards till they complete Class 12".
const CLASS_SPAN = new RegExp(
  String.raw`\bfrom\s+(?:class|grade|std\.?|standard)\s*${LEVEL}\b[^.]{0,40}?\b(?:till|until|up to|upto)\b[^.]{0,40}?\b(?:class|grade|std\.?|standard)\s*${LEVEL}\b`,
  'i',
);

// A stated range of classes wins, the widest if there are several (a narrow
// one is often a promotion, "from class 9th to class 10th"). Otherwise, when
// a source names several classes, the highest is the one the Student must be
// in; the lower ones are earlier qualifications ("Passed class 10").
const classRule: FieldRule = (sentences) => {
  let widest: { from: number; to: number; sentence: string } | undefined;
  for (const sentence of sentences) {
    const m = sentence.match(CLASS_RANGE) ?? sentence.match(CLASS_SPAN);
    const from = m && toClass(m[1]);
    const to = m && toClass(m[2]);
    if (from && to && from < to) {
      if (!widest || to - from > widest.to - widest.from)
        widest = { from, to, sentence };
    }
  }
  if (widest) {
    const labels = [];
    for (let level = widest.from; level <= widest.to; level++)
      labels.push(String(level));
    return found('class', labels, widest.sentence);
  }
  let best: { level: number; label: string; sentence: string } | undefined;
  for (const sentence of sentences) {
    for (const [, label] of sentence.matchAll(CLASS_MENTION)) {
      const level = toClass(label) ?? 0;
      if (!best || level > best.level) best = { level, label, sentence };
    }
  }
  return best && found('class', [best.label], best.sentence);
};

// "parental income ... not more than ₹3,50,000/-", "income below Rs.2.5
// lakh": an upper limit on family income.
const INCOME_LIMIT = new RegExp(
  String.raw`\bincome\b[^.]{0,80}?\b(?:not more than|not exceeding|does not exceed|should not exceed|not exceed|less than|below|up to|upto|within|under|maximum of|limit of|ceiling of)\b[^.\d₹]{0,40}?` +
    `(${MONEY.source})`,
  'i',
);

const incomeRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    const m = sentence.match(INCOME_LIMIT);
    if (m) return found('incomeBand', m[1], sentence);
  }
  return undefined;
};

// "minimum of 60% marks", "at least 75%", "80% or above", "secured 60%
// marks".
const MIN_PERCENT =
  /\b(?:minimum(?: of)?|at least|not less than)\s*(\d{2,3}(?:\.\d+)?)\s*%|\b(\d{2,3}(?:\.\d+)?)\s*%\s*(?:marks\s*)?(?:or above|or more|and above)|\b(?:secur|scor|obtain)(?:e|ed|es|ing)\s+(?:an? )?(?:aggregate of\s*)?(\d{2,3}(?:\.\d+)?)\s*%/i;
// Cut-offs in a selection test are not marks a Student's Profile records.
const TEST_CUT_OFF = /\btests?\b|\bMAT\b|\bSAT\b/i;
// "Class 10th", "class XII", "Std. 8"; "SSC" and "matriculation" are Class
// 10, "HSC", "Higher Secondary", "Senior Secondary" and "10+2" Class 12.
const YEAR_MENTION = new RegExp(
  String.raw`\b(?:class|grade|std\.?|standard)\s*(\d{1,2}|[ivx]+)(?:st|nd|rd|th)?\b|(\bSSC\b|\bmatric\w*)|(\bHSC\b|\bhigher secondary\b|\bsenior secondary\b|\b10\s*\+\s*2\b)`,
  'gi',
);
const ROMAN_YEAR: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
};

// The year of the exam a marks threshold is for: the first year named after
// the percentage ("75% in Class 10"), else the last one before it ("passed
// Class XII with 80%"). Undefined when the sentence names no year.
function marksYear(sentence: string, percentAt: number): number | undefined {
  const mentions = [...sentence.matchAll(YEAR_MENTION)].map((m) => ({
    at: m.index,
    year: m[2]
      ? 10
      : m[3]
        ? 12
        : (ROMAN_YEAR[m[1].toLowerCase()] ?? Number(m[1])),
  }));
  const after = mentions.find((m) => m.at > percentAt);
  return (after ?? mentions.filter((m) => m.at < percentAt).pop())?.year;
}

interface MarksThreshold {
  percent: string;
  year: number;
  sentence: string;
}

// Every sentence stating a minimum percentage for a named year.
function marksThresholds(sentences: string[]): MarksThreshold[] {
  return sentences.flatMap((sentence) => {
    if (TEST_CUT_OFF.test(sentence)) return [];
    const m = sentence.match(MIN_PERCENT);
    if (!m) return [];
    const year = marksYear(sentence, m.index ?? 0);
    return year ? [{ percent: m[1] ?? m[2] ?? m[3], year, sentence }] : [];
  });
}

// Board marks: a percentage for the Class 10 or Class 12 board exam. A
// Student can still raise their marks, so both are changeable. Marks naming
// no year are left to the LLM.
function boardMarksRule(field: 'class10Result' | 'class12Result'): FieldRule {
  const year = field === 'class10Result' ? 10 : 12;
  return (sentences) => {
    const threshold = marksThresholds(sentences).find((t) => t.year === year);
    return threshold && found(field, threshold.percent, threshold.sentence);
  };
}

// Marks for any other year (NMMS's Class 7 or 8) are never asked, so they
// are shown as Extra requirements rather than matched on the wrong result.
export function otherYearMarks(sentences: string[]): ExtraRequirement[] {
  return marksThresholds(sentences)
    .filter((t) => t.year !== 10 && t.year !== 12)
    .map((t) => ({
      text: `At least ${t.percent}% marks in Class ${t.year}`,
      sourceText: t.sentence,
    }));
}

// "studying ... in a Government, Government-aided and local body school".
// Only where the Student studies now: "Passed class 10 from a government
// school" is an earlier qualification.
const schoolTypeRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    if (!/\bstudying\b/i.test(sentence) || !/\bschools?\b/i.test(sentence))
      continue;
    const types = [];
    if (/\bgovernment\b(?![\s-]*aided)/i.test(sentence))
      types.push('government');
    if (/\baided\b/i.test(sentence)) types.push('aided');
    if (/\bprivate\b/i.test(sentence)) types.push('private');
    if (types.length) return found('schoolType', types, sentence);
  }
  return undefined;
};

// A field whose values a source names in regular words. The first sentence
// that both cues the field and names one of its options gives the Criterion;
// its value is every option that sentence names.
interface KeywordField {
  field: string;
  // The sentence must say this before its options count.
  cue?: RegExp;
  // Sentences about relaxations and quotas don't restrict who may apply.
  skip?: RegExp;
  // A sentence naming a value the Profile has no option for gives no
  // Criterion: one listing only the options it does have would wrongly fail
  // the Students it leaves out.
  beyondOptions?: RegExp;
  options: [raw: string, pattern: RegExp][];
}

const STUDENTS = String.raw`(?:[Ss]tudents?|[Cc]andidates?|[Aa]pplicants?|[Cc]hildren|[Ww]ards)`;

const CATEGORY_ABBREVIATIONS = String.raw`(?:SC|ST|OBC|EWS|EBC|DNT)`;

const KEYWORD_FIELDS: KeywordField[] = [
  {
    field: 'category',
    cue: new RegExp(
      String.raw`\b[Bb]elong(?:s|ing)? to\b|\b[Cc]ategor(?:y|ies)\b|\b${CATEGORY_ABBREVIATIONS}(?:\s*[/,]\s*${CATEGORY_ABBREVIATIONS})*\s+${STUDENTS}\b|\b[Ss]chedul(?:e|ed) (?:[Cc]astes?|[Tt]ribes?) ${STUDENTS}\b`,
    ),
    skip: /relax|cut-?off|reserv|quota/i,
    beyondOptions:
      /\b(?:MBC|SEBC|VJNT)s?\b|\b[Ee]xtremely [Bb]ackward\b|\b[Mm]ost [Bb]ackward\b|\bVimukta\b/,
    options: [
      ['sc', /\bSC\b|\b[Ss]chedul(?:e|ed) [Cc]astes?\b/],
      ['st', /\bST\b|\b[Ss]chedul(?:e|ed) [Tt]ribes?\b/],
      ['obc', /\bOBC\b|\b[Oo]ther [Bb]ackward [Cc]lass(?:es)?\b/],
      ['ews', /\bEWS\b/],
      // EBC is not EWS: an Economically Backward Class, not a weaker section.
      ['ebc', /\bEBCs?\b|\b[Ee]conomically [Bb]ackward [Cc]lass(?:es)?\b/],
      ['dnt', /\bDNTs?\b|\b[Dd]e-?notified\b/],
    ],
  },
  {
    field: 'minority',
    skip: /reserv|quota/i,
    options: [
      [
        'yes',
        /\bminority communit(?:y|ies)\b|\bminorities\b|\bminority students\b/i,
      ],
    ],
  },
  {
    field: 'disability',
    // A seat quota for them isn't a condition; "reserved for" them is.
    skip: /reservation|quota/i,
    options: [
      [
        'yes',
        /\b(?:students?|persons?|people|candidates?|children) with (?:benchmark )?disabilit(?:y|ies)\b|\bdifferently[- ]abled\b|\bPwDs?\b|\bdivyang/i,
      ],
    ],
  },
  {
    field: 'singleGirlChild',
    options: [['yes', /\b(?:single|only) girl child\b/i]],
  },
  {
    field: 'citizenship',
    options: [
      ['indian', /\bindian (?:national|citizen)s?\b|\bcitizens? of india\b/i],
    ],
  },
  {
    field: 'domicileState',
    cue: /\bdomicile|\bdomiciled\b|\b(?:permanent )?residents? of\b/i,
    options: STATE_NAMES,
  },
  {
    field: 'stream',
    cue: /\bstreams?\b/i,
    options: [
      ['science', /\bscience\b/i],
      ['commerce', /\bcommerce\b/i],
      ['arts', /\barts\b|\bhumanities\b/i],
    ],
  },
  {
    field: 'board',
    // About the Students' board, not the officials of one ("For State
    // Government/State Boards").
    cue: new RegExp(
      String.raw`\b${STUDENTS}\b|\b(?:[Pp]assed|[Pp]assing|[Ss]tudying|[Aa]ffiliated)\b`,
    ),
    // "a recognized Board of Education including CBSE, ICSE, NIOS": any
    // board will do, the ones listed are examples.
    beyondOptions:
      /\brecogni[sz]ed [Bb]oards?\b|\bany [Bb]oards?\b|\bincluding\b[^.]*?(?:\bCBSE\b|\bI?CSE\b|\bCISCE\b|\bstate boards?\b|\bCentral Board\b)/i,
    options: [
      ['cbse', /\bCBSE\b/],
      ['cisce', /\bCISCE\b|\bICSE\b/],
      ['state', /\bstate boards?\b/i],
      ['ib', /\bInternational Baccalaureate\b/i],
      ['cambridge', /\bIGCSE\b|\bCambridge (?:board|international)\b/i],
    ],
  },
  {
    field: 'parentOccupation',
    options: [
      [
        'defence',
        /\bex-?servicem[ae]n\b|\bdefence personnel\b|\barmed forces\b/i,
      ],
      [
        'central_armed_police',
        /\bcentral armed police\b|\bCAPFs?\b|\bAssam Rifles\b/i,
      ],
      ['construction_worker', /\bconstruction workers?\b/i],
      [
        'beedi_cine_mine_worker',
        /\b(?:beedi|cine|mine)\b[^.]{0,30}\bworkers?\b/i,
      ],
    ],
  },
  {
    field: 'examsQualified',
    cue: /\bqualif/i,
    options: [
      ['nmms', /\bNMMSS?\b|\bnational means[- ]cum[- ]merit\b/i],
      ['olympiad', /\bolympiads?\b/i],
    ],
  },
];

function keywordRule(spec: KeywordField): FieldRule {
  return (sentences) => {
    for (const sentence of sentences) {
      if (spec.cue && !spec.cue.test(sentence)) continue;
      if (spec.skip?.test(sentence)) continue;
      if (spec.beyondOptions?.test(sentence)) continue;
      const named = spec.options
        .filter(([, pattern]) => pattern.test(sentence))
        .map(([raw]) => raw);
      if (named.length === 0) continue;
      const raw = CRITERION_FIELDS[spec.field].op === 'eq' ? named[0] : named;
      return found(spec.field, raw, sentence);
    }
    return undefined;
  };
}

const DEADLINE_CUE =
  /\b(?:last date|deadline|closing date|apply (?:by|before)|open till|closes?(?: on)?|on or before|due date)\b/i;

// The date a Student must apply by, as the source wrote it, if any. It comes
// from the first sentence with a closing cue and a date; dates for officials
// ("Institute Verification Open till") are not the deadline. A sentence can
// carry an opening date too ("open from 1 July 2026, last date 31 October
// 2026"), so the date is the first one after the cue, else the nearest one
// before it.
export function deadlineText(sentences: string[]): string | undefined {
  for (const sentence of sentences) {
    const cue = sentence.match(DEADLINE_CUE);
    if (!cue || /verification/i.test(sentence)) continue;
    const dates = [...sentence.matchAll(new RegExp(DATE.source, 'gi'))];
    if (dates.length === 0) continue;
    const cueAt = cue.index ?? 0;
    const after = dates.find((d) => d.index >= cueAt);
    return (after ?? dates[dates.length - 1])[0];
  }
  return undefined;
}

// Every field rule, each finding at most one Criterion.
export const FIELD_RULES: FieldRule[] = [
  genderRule,
  classRule,
  incomeRule,
  boardMarksRule('class10Result'),
  boardMarksRule('class12Result'),
  schoolTypeRule,
  ...KEYWORD_FIELDS.map(keywordRule),
];

// A sentence is worth reading if it uses a word some rule looks for.
const RULE_WORDS = KEYWORD_FIELDS.flatMap((spec) => [
  ...(spec.cue ? [spec.cue] : []),
  ...spec.options.map(([, pattern]) => pattern),
]);

// Neither a condition for keeping a scholarship once awarded nor how its
// places are shared out between groups is a Criterion (see GLOSSARY.md), so
// no rule reads such a sentence. Places are shared out when a sentence
// segregates, divides or shares them, or reserves, earmarks or allots a
// percentage or ratio of them ("At least 30% of these scholarships are
// reserved for girls"). A plain "reserved for students with disabilities"
// shares nothing and is still a condition.
const RENEWAL = /\brenew(?:al|als|ed|ing)?\b/i;
const PLACES = /\b(?:scholarships?|slots?|seats?)\b/i;
const SHARES_OUT = /\bshares?\b|\bsegregat\w*|\bdivided\b|\bin the ratio of\b/i;
const SETS_ASIDE = /\breserved\b|\bearmarked\b|\ballott?ed\b/i;
const PERCENT_OR_RATIO = /\d\s*%|\bper ?cent\b|\b\d+\s*:\s*\d+\b/i;

function isNotACondition(sentence: string): boolean {
  if (RENEWAL.test(sentence)) return true;
  if (!PLACES.test(sentence)) return false;
  return (
    SHARES_OUT.test(sentence) ||
    (SETS_ASIDE.test(sentence) && PERCENT_OR_RATIO.test(sentence))
  );
}

export function isEligibilitySentence(sentence: string): boolean {
  if (isNotACondition(sentence)) return false;
  return (
    ELIGIBILITY_WORDS.test(sentence) ||
    RULE_WORDS.some((pattern) => pattern.test(sentence))
  );
}
