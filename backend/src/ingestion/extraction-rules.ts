import { COUNTRIES, INDIA, REGIONS } from '../match/countries.js';
import {
  BOARD_MARKS_FIELDS,
  type BoardMarksField,
  CRITERION_FIELDS,
} from '../scholarships/criterion-fields.js';
import type {
  Criterion,
  ExtraRequirement,
} from '../scholarships/scholarship.schema.js';
import {
  DATE,
  escape,
  MONEY,
  STATE_NAMES,
  toClass,
  toIncomeLimit,
} from './normalise.js';

// What a rule found, before normalisation: the raw value as the source
// wrote it ("₹3,50,000/-", "IX", "Andhra Pradesh") and its sentence.
export interface Found {
  field: string;
  op: Criterion['op'];
  raw: string | string[];
  changeable: boolean;
  sourceText: string;
  alternativeGroup?: string;
}

// Most rules find one Criterion; a Board marks rule finds one per Result
// scale a source accepts, as an alternatives group.
export type FieldRule = (sentences: string[]) => Found | Found[] | undefined;

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
const INCOME_CUE = String.raw`\bincome\b[^.]{0,80}?\b(?:not more than|not exceeding|does not exceed|should not exceed|not exceed|less than|below|up to|upto|within|under|maximum of|limit of|ceiling of)\b`;
const INCOME_LIMIT = new RegExp(
  INCOME_CUE + String.raw`[^.\d₹]{0,40}?` + `(${MONEY.source})`,
  'i',
);

const incomeRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    const m = sentence.match(INCOME_LIMIT);
    if (m) return found('incomeBand', m[1], sentence);
  }
  return undefined;
};

// The same limit in another currency, with how often it is counted: "household
// monthly income ... should NOT exceed an amount equivalent to US Dollar Five
// Thousand (US$ 5000)", "household income of under £62,215 a year".
const FOREIGN_INCOME_CUE = new RegExp(INCOME_CUE, 'i');
const FOREIGN_INCOME_REACH = 80;

const foreignIncomeRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    const cue = sentence.match(FOREIGN_INCOME_CUE);
    if (!cue || INCOME_LIMIT.test(sentence)) continue;
    const start = (cue.index ?? 0) + cue[0].length;
    const after = sentence.slice(start, start + FOREIGN_INCOME_REACH);
    const limit = toIncomeLimit(after.split(/\.(?!\d)/)[0]);
    if (!limit) continue;
    const period = toIncomeLimit(sentence)?.period ?? limit.period;
    const raw = `${limit.currency} ${limit.value} ${period}`;
    return found('incomeAmount', raw, sentence);
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
    const minimum = sentence.match(MIN_PERCENT);
    if (!minimum) return [];
    const year = marksYear(sentence, minimum.index ?? 0);
    const percent = minimum[1] ?? minimum[2] ?? minimum[3];
    return year ? [{ percent, year, sentence }] : [];
  });
}

// Results on the other Result scales, each written the way normaliseValue
// reads it. IB points, A-level grades and a GPA are Class 12 results; a
// CGPA out of 10 is a Class 10 (CBSE) one.
const IB = /\bIB\b|\bInternational Baccalaureate\b/;
const IB_POINTS = /\b(\d{1,2})\s*(?:total\s+)?points\b/i;
const A_LEVEL = /\bA[- ]levels?\b/i;
const A_LEVEL_GRADES = /(?<![\w*])((?:A\*|[A-E]){2,5})(?![\w*])/;
// A minimum on a scale named by a word: "a minimum GPA of 3.0", "GPA of at
// least 3.5", "8.5 CGPA or above". A bare figure beside the word is not one
// ("CGPA X 9.5 will give the percentage").
function minimumOn(unit: string): RegExp {
  const n = String.raw`(\d{1,2}(?:\.\d{1,2})?)`;
  return new RegExp(
    [
      String.raw`\b(?:minimum|at least|not less than)\s+(?:an?\s+)?(?:unweighted\s+)?${unit}\s+(?:of\s+)?${n}`,
      String.raw`\b${unit}\s+of\s+(?:at least\s+|minimum(?: of)?\s+|not less than\s+)?${n}`,
      String.raw`\b${n}\s+(?:unweighted\s+)?${unit}\s+(?:or above|or more|and above|or higher)`,
    ].join('|'),
    'i',
  );
}
const GPA = minimumOn('GPA');
const CGPA = minimumOn('CGPA');
const figure = (m: RegExpMatchArray) => m[1] ?? m[2] ?? m[3];
// A weighted GPA and AP scores are no scale the Profile takes (Extra
// requirements). "AP" alone is often Andhra Pradesh in Indian sources.
const WEIGHTED_GPA = /(?<!un)weighted\s+GPA\b/i;
const AP = /\bAP (?:exams?|scores?|courses?|tests?)\b|\bAdvanced Placement\b/;

interface ScaleRule {
  field: BoardMarksField;
  read: (sentence: string) => string | undefined;
}

const SCALE_RULES: ScaleRule[] = [
  {
    field: 'class12Result',
    read: (s) => {
      const points = IB.test(s) ? s.match(IB_POINTS) : null;
      return points ? `${points[1]} IB points` : undefined;
    },
  },
  {
    field: 'class12Result',
    read: (s) => {
      const grades = A_LEVEL.test(s) ? s.match(A_LEVEL_GRADES) : null;
      return grades ? `${grades[1]} at A-level` : undefined;
    },
  },
  {
    field: 'class12Result',
    read: (s) => {
      if (WEIGHTED_GPA.test(s) || /\bCGPA\b/i.test(s)) return undefined;
      const m = s.match(GPA);
      return m ? `${figure(m)} GPA` : undefined;
    },
  },
  {
    // Only a CGPA the sentence ties to Class 10: a degree CGPA is no board
    // result.
    field: 'class10Result',
    read: (s) => {
      const m = s.match(CGPA);
      if (!m || marksYear(s, m.index ?? 0) !== 10) return undefined;
      return `${figure(m)} CGPA`;
    },
  },
];

// Board marks for the Class 10 or Class 12 board exam: a percentage for a
// named year, or a result on another Result scale. A Student can still
// raise their marks, so both are changeable. A Student has one result per
// slot, so results on several scales for the same slot ("36 points in the
// IB Diploma or AAA at A-level") are alternatives: one Criterion per scale,
// the first stated for each, grouped. Percentage marks naming no year are
// left to the LLM.
function boardMarksRule(field: BoardMarksField): FieldRule {
  const year = field === 'class10Result' ? 10 : 12;
  return (sentences) => {
    const results: Found[] = [];
    const threshold = marksThresholds(sentences).find((t) => t.year === year);
    if (threshold) {
      results.push(found(field, threshold.percent, threshold.sentence));
    }
    for (const rule of SCALE_RULES.filter((r) => r.field === field)) {
      for (const sentence of sentences) {
        const raw = rule.read(sentence);
        if (raw === undefined) continue;
        results.push(found(field, raw, sentence));
        break;
      }
    }
    if (results.length < 2) return results;
    return results.map((r) => ({ ...r, alternativeGroup: field }));
  };
}

// Marks rules no Profile answer can settle, shown as Extra requirements
// rather than matched on the wrong result: marks for any other year (NMMS's
// Class 7 or 8), GCSE/IGCSE grades, and results on scales the Profile
// doesn't take.
export function marksExtraRequirements(
  sentences: string[],
): ExtraRequirement[] {
  return [...otherYearMarks(sentences), ...unsupportedResults(sentences)];
}

function otherYearMarks(sentences: string[]): ExtraRequirement[] {
  return marksThresholds(sentences)
    .filter((t) => t.year !== 10 && t.year !== 12)
    .map((t) => ({
      text: `At least ${t.percent}% marks in Class ${t.year}`,
      sourceText: t.sentence,
    }));
}

const UNSUPPORTED_RESULTS: [text: string, pattern: RegExp][] = [
  ['GCSE/IGCSE results', /\bI?GCSEs?\b/],
  ['A weighted GPA', WEIGHTED_GPA],
  ['AP exam scores', AP],
  ["Quebec's R score", /\bR[- ]score\b|\bcote R\b/i],
];

function unsupportedResults(sentences: string[]): ExtraRequirement[] {
  return sentences.flatMap((sentence) =>
    UNSUPPORTED_RESULTS.filter(([, pattern]) => pattern.test(sentence)).map(
      ([text]) => ({ text, sourceText: sentence }),
    ),
  );
}

// The words a Board marks sentence on another Result scale uses.
const RESULT_WORDS = [IB, A_LEVEL, /\bC?GPA\b/i, /\bI?GCSEs?\b/, AP];

// Test scores apart from Board marks: "an ATAR of at least 99.90", "SAT
// composite score of 1200", "SAT score ≥ 1450". The figure is the first one
// after the name, in the same sentence, and must be inside the score's range
// (normaliseValue), so NMMS's "Scholastic Aptitude Test (SAT) ... 40 %
// marks" gives nothing. A predicted ATAR is still the ATAR a Student gives.
// Both are changeable: a Student can still sit or resit the test.
const ATAR = /\bATAR\b[^.\d]{0,40}?(\d{1,2}(?:\.\d{1,2})?)(?!\.?\d|\s*%)/;
const SAT = /\bSAT\b[^.\d]{0,40}?(\d,?\d{3}|\d{3})(?![.,]?\d|\s*%)/;

function testScoreRule(field: 'atar' | 'sat', pattern: RegExp): FieldRule {
  return (sentences) => {
    for (const sentence of sentences) {
      const m = sentence.match(pattern);
      if (m) return found(field, m[1].replace(/,/g, ''), sentence);
    }
    return undefined;
  };
}

const TEST_SCORE_RULES = [
  testScoreRule('atar', ATAR),
  testScoreRule('sat', SAT),
];

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
    // An NRI is an Indian citizen living abroad; PIO cards were merged into
    // OCI cards.
    options: [
      [
        'indian',
        /\bindian (?:national|citizen)s?\b|(?<!overseas\s)\bcitizens? of india\b|\bNRIs?\b|\bnon-?resident indians?\b/i,
      ],
      [
        'oci',
        /\bOCIs?\b|\bPIOs?\b|\b[Oo]verseas [Cc]itizens? of India\b|\b[Pp]ersons? of Indian [Oo]rigin\b/,
      ],
    ],
  },
  {
    // Domicile sentences name the Home state.
    field: 'homeState',
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
    // GCSE/IGCSE grades asked of every applicant are an Extra requirement,
    // not the board the Student is on.
    skip: /\bI?GCSEs?\b[^.]*\b(?:pass(?:es)?|grades?)\b|\b(?:pass(?:es)?|grades?)\b[^.]*\bI?GCSEs?\b/i,
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
    // The subjects a source restricts an award to, read as the Field of
    // study groups they belong to. Subjects named as examples, as an
    // encouragement or for the amount paid restrict nothing, and a stream is
    // not a field of study (above).
    field: 'fieldOfStudy',
    cue: /\b(?:only|must|exclusively|(?:is|are) (?:only )?(?:for|open to)|open (?:only )?to|restricted to|limited to)\b[^.]*\b(?:pursu(?:e|es|ing)|stud(?:y|ies|ying)|courses?|degrees?|programmes?|programs?|disciplines?)\b/i,
    skip: /\bstreams?\b|\bsuch as\b|\betc\b|\bencouraged\b|\bwill (?:get|receive)\b/i,
    options: [
      ['engineering', /\bengineering\b|\bB\.?\s?Tech\b/i],
      [
        'medicine',
        /\bmedicine\b|\bmedical (?:studies|courses?|degrees?|education|sciences?)\b|\bMBBS\b|\bnursing\b|\bpharmacy\b|\bdentistry\b/i,
      ],
      [
        'science',
        /\b(?:natural|pure|basic) sciences?\b|\bphysics\b|\bchemistry\b|\bbiology\b|\bmathematics\b|\bB\.?\s?Sc\b/i,
      ],
      [
        'computing',
        /\bcomputer science\b|\bcomputing\b|\binformation technology\b/i,
      ],
      [
        'commerce',
        /\bcommerce\b|\bbusiness (?:studies|administration)\b|\baccount(?:ancy|ing)\b|\bB\.?\s?Com\b|\bBBA\b/i,
      ],
      [
        'law',
        /\bLL\.?B\b|\blegal studies\b|\blaw (?:degrees?|courses?)\b|\b(?:in|of) law\b|\b(?:stud(?:y|ying)|pursu(?:e|ing)) law\b/i,
      ],
      [
        'arts',
        /\bhumanities\b|\b(?:liberal|fine|performing) arts\b|\bliterature\b|\bphilosophy\b/i,
      ],
      [
        'social_sciences',
        /\bsocial sciences?\b|\beconomics\b|\bpsychology\b|\bsociology\b|\bpolitical science\b/i,
      ],
      [
        'design',
        /\b(?:fashion|graphic|product|interior) design\b|\barchitecture\b|\bB\.?\s?Arch\b|\bB\.?\s?Des\b/i,
      ],
      ['agriculture', /\bagricultur(?:e|al)\b|\bhorticulture\b|\bfisheries\b/i],
      ['education', /\bteacher training\b|\bB\.?\s?Ed\b/i],
    ],
  },
  {
    // Home-student awards are for Students studying in the country they
    // live in, international-student awards for the others. A sentence
    // naming both restricts nothing, nor does one that only mentions them
    // ("international students may write to the office").
    field: 'destinationIsResidence',
    cue: /\b(?:for|open to|only|must be|eligible|restricted to|limited to)\b[^.]*\b(?:home|domestic|international|overseas) students?\b|\b(?:home|domestic|international|overseas) students? only\b/i,
    beyondOptions:
      /\b(?:home|domestic)\b[^.]*\b(?:international|overseas)\b|\b(?:international|overseas)\b[^.]*\b(?:home|domestic)\b/i,
    options: [
      ['yes', /\b(?:home|domestic) students?\b/i],
      ['no', /\b(?:international|overseas) students?\b/i],
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

// Where the Student must live, and the country they must be a citizen of,
// read from the countries and regions a sentence names. India is never a
// country of residence here: an Indian source's "residents of India" is not
// a condition a Student abroad could have read, and Indian states are the
// Home state (above).
const COUNTRY_ALIASES: Record<string, string[]> = {
  GB: ['UK', 'U.K.', 'Britain', 'Great Britain'],
  US: ['USA', 'U.S.A.', 'U.S.', 'United States of America'],
  AE: ['UAE', 'U.A.E.', 'Emirates'],
};
// Regions are read only for the countries the Watchlist has sources for,
// under the names those sources use.
const REGION_COUNTRIES = ['AE', 'AU', 'CA', 'GB', 'US'];
const REGION_ALIASES: Record<string, string[]> = {
  'AE-AJ': ['Ajman'],
  'AE-AZ': ['Abu Dhabi'],
  'AE-DU': ['Dubai'],
  'AE-FU': ['Fujairah'],
  'AE-RK': ['Ras Al Khaimah', 'Ras al-Khaimah'],
  'AE-SH': ['Sharjah'],
  'AE-UQ': ['Umm Al Quwain'],
};

type PlaceName = [code: string, pattern: RegExp, name: string];

// One pattern per name, longest first, so "New South Wales" is read before
// "Wales" and "Papua New Guinea" before "Guinea".
function placeNames(places: [code: string, names: string[]][]): PlaceName[] {
  return places
    .flatMap(([code, names]) =>
      names.map((name): PlaceName => [
        code,
        new RegExp(String.raw`(?<![\w-])${escape(name)}(?![\w-])`, 'g'),
        name,
      ]),
    )
    .sort((a, b) => b[2].length - a[2].length);
}

const COUNTRY_NAMES = placeNames(
  COUNTRIES.map((c) => [
    c.value,
    [c.label, ...(COUNTRY_ALIASES[c.value] ?? [])],
  ]),
);
const REGION_NAMES = placeNames(
  REGION_COUNTRIES.flatMap((country) =>
    (REGIONS[country] ?? []).map((r): [string, string[]] => [
      r.value,
      [r.label, ...(REGION_ALIASES[r.value] ?? [])],
    ]),
  ),
);

// The codes of the places a text names, in the order it names them, and the
// text with those names blanked out.
function namedPlaces(
  text: string,
  names: PlaceName[],
): { codes: string[]; rest: string } {
  const at = new Map<string, number>();
  let rest = text;
  for (const [code, pattern] of names) {
    rest = rest.replace(pattern, (name, index: number) => {
      if (!at.has(code) || at.get(code)! > index) at.set(code, index);
      return ' '.repeat(name.length);
    });
  }
  const codes = [...at.keys()].sort((a, b) => at.get(a)! - at.get(b)!);
  return { codes, rest };
}

const LIVES =
  /\bresid(?:e|es|ent|ents|ing)\b|\b(?:living|lives?) in\b|\bresident in\b/i;
const PERMANENT_RESIDENT = /\bpermanent residen(?:ts?|cy)\b/i;
const CITIZEN = /\b[Cc]itizens?\b|\bnationals\b/;
const OCI = /\b[Oo]verseas [Cc]itizens? of India\b/g;

// The regions, then the countries outside India, a sentence names; a region
// name is not read again as a country ("Northern Ireland" is not Ireland).
function placesIn(sentence: string) {
  const plain = sentence.replace(OCI, ' ');
  const regions = namedPlaces(plain, REGION_NAMES);
  const countries = namedPlaces(regions.rest, COUNTRY_NAMES).codes.filter(
    (code) => code !== INDIA,
  );
  return { plain, regions: regions.codes, countries };
}

// "residents of the United Arab Emirates", "living in the UK".
const countryOfResidenceRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    const { plain, countries } = placesIn(sentence);
    if (LIVES.test(plain) && countries.length)
      return found('countryOfResidence', countries, sentence);
  }
  return undefined;
};

// "residing in Ontario", "residents of Dubai".
const regionRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    const { plain, regions } = placesIn(sentence);
    if (LIVES.test(plain) && regions.length)
      return found('region', regions, sentence);
  }
  return undefined;
};

// "Singapore Citizens or Permanent Residents": a Residence status in the
// country named.
const residenceStatusRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    const { plain, countries } = placesIn(sentence);
    if (!PERMANENT_RESIDENT.test(plain) || !countries.length) continue;
    const statuses = CITIZEN.test(plain)
      ? ['citizen', 'permanent_resident']
      : ['permanent_resident'];
    return found('residenceStatus', statuses, sentence);
  }
  return undefined;
};

// "citizens of the United States": a citizen of the country named, wherever
// they live. Citizens alongside residents are read as a Residence status.
const citizenshipCountryRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    const { plain, countries } = placesIn(sentence);
    if (!CITIZEN.test(plain) || LIVES.test(plain) || !countries.length)
      continue;
    return found('citizenshipCountry', countries, sentence);
  }
  return undefined;
};

// "to study at a university in the United States": where the Student must
// study. As for residence, India is never read: an Indian source's "study in
// India" is not a condition, and schools are where a Student lives.
const STUDY_ABROAD =
  /\bstud(?:y|ying)\b[^.]*\b(?:universit(?:y|ies)|colleges?|higher education)\b|\b(?:universit(?:y|ies)|colleges?)\s+in\b/i;

const destinationRule: FieldRule = (sentences) => {
  for (const sentence of sentences) {
    const { plain, countries } = placesIn(sentence);
    if (STUDY_ABROAD.test(plain) && !LIVES.test(plain) && countries.length)
      return found('destination', countries, sentence);
  }
  return undefined;
};

const RESIDENCE_RULES = [
  countryOfResidenceRule,
  regionRule,
  residenceStatusRule,
  citizenshipCountryRule,
  destinationRule,
];
const RESIDENCE_WORDS = [LIVES, PERMANENT_RESIDENT, CITIZEN, STUDY_ABROAD];

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
  foreignIncomeRule,
  ...BOARD_MARKS_FIELDS.map(boardMarksRule),
  ...TEST_SCORE_RULES,
  schoolTypeRule,
  ...KEYWORD_FIELDS.map(keywordRule),
  ...RESIDENCE_RULES,
];

// A sentence is worth reading if it uses a word some rule looks for.
const RULE_WORDS = [
  ...KEYWORD_FIELDS.flatMap((spec) => [
    ...(spec.cue ? [spec.cue] : []),
    ...spec.options.map(([, pattern]) => pattern),
  ]),
  ...RESIDENCE_WORDS,
  ...RESULT_WORDS,
  ATAR,
  SAT,
];

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
