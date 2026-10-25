// Normalisation: turns the raw values the rules (and, later, the LLM) find
// into the exact values the Matcher compares against the Profile.
import { COUNTRIES, REGIONS } from '../match/countries.js';
import { CURRENCY_CODES, RUPEES } from '../match/currencies.js';
import {
  type ALevelGrade,
  type BoardResult,
  type IncomeLimit,
  type IncomePeriod,
  type IndianState,
  type Profile,
  RESULT_SCALE_RANGES,
  type ResultScale,
  SLOT_SCALES,
  TEST_SCORE_RANGES,
  type TestScoreField,
} from '../match/profile.js';
import {
  type BoardMarksField,
  isBoardMarksField,
} from '../scholarships/criterion-fields.js';

const LAKH = 100_000;
const CRORE = 10_000_000;

// A money figure as written in Indian sources: "₹3,50,000/-", "Rs.3 lakh",
// "INR 2.5 lakhs", "1 crore". Group 1 is the number, group 2 the unit.
export const MONEY =
  /(?:₹|\bRs\.?|\bINR)\s*([\d,]+(?:\.\d+)?)(?:\s*\/-)?(?:\s*(lakhs?|lacs?|crores?)\b)?|\b(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?)\b/i;

const ROMAN_CLASS: Record<string, number> = { ix: 9, x: 10, xi: 11, xii: 12 };
const CLASSES = [9, 10, 11, 12];

// "IX", "10th", "Class 12" → 9, 10, 12; anything outside Class 9–12 is
// dropped.
export function toClass(label: string): number | undefined {
  const bare = label
    .toLowerCase()
    .replace(/\b(?:class|grade|std\.?|standard)\s*/, '')
    .replace(/(?:st|nd|rd|th)$/, '')
    .trim();
  const level = ROMAN_CLASS[bare] ?? Number(bare);
  return CLASSES.includes(level) ? level : undefined;
}

const asList = (raw: string | string[]) => (Array.isArray(raw) ? raw : [raw]);

// Each slug as sources write it, plus spellings that differ.
const STATE_ALIASES: Partial<Record<IndianState, string[]>> = {
  chhattisgarh: ['chattisgarh'],
  odisha: ['orissa'],
  puducherry: ['pondicherry'],
  delhi: ['nct of delhi'],
  jammu_and_kashmir: ['j&k', 'j & k'],
  dadra_and_nagar_haveli_and_daman_and_diu: [
    'dadra nagar haveli and daman and diu',
    'dadra and nagar haveli',
    'daman and diu',
  ],
};

const STATES: IndianState[] = [
  'andhra_pradesh',
  'arunachal_pradesh',
  'assam',
  'bihar',
  'chhattisgarh',
  'goa',
  'gujarat',
  'haryana',
  'himachal_pradesh',
  'jharkhand',
  'karnataka',
  'kerala',
  'madhya_pradesh',
  'maharashtra',
  'manipur',
  'meghalaya',
  'mizoram',
  'nagaland',
  'odisha',
  'punjab',
  'rajasthan',
  'sikkim',
  'tamil_nadu',
  'telangana',
  'tripura',
  'uttar_pradesh',
  'uttarakhand',
  'west_bengal',
  'andaman_and_nicobar_islands',
  'chandigarh',
  'dadra_and_nagar_haveli_and_daman_and_diu',
  'delhi',
  'jammu_and_kashmir',
  'ladakh',
  'lakshadweep',
  'puducherry',
];

// A text with every regex special character escaped, to match it literally.
export const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// "tamil nadu" → /\btamil\s+nadu\b/, with "and" also matching "&".
const namePattern = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => (word === 'and' ? '(?:and|&)' : escape(word)))
    .join(String.raw`\s+`);

// Each state or union territory's slug with a pattern for its name. The
// longest names come first, so "Dadra and Nagar Haveli and Daman and Diu"
// is not read as a shorter name inside it.
export const STATE_NAMES: [IndianState, RegExp][] = STATES.map(
  (slug): [IndianState, RegExp] => {
    const names = [slug.replace(/_/g, ' '), ...(STATE_ALIASES[slug] ?? [])];
    const alternatives = names.map(namePattern).join('|');
    return [
      slug,
      new RegExp(String.raw`(?<![\w&])(?:${alternatives})(?![\w&])`, 'i'),
    ];
  },
);

// Every ISO 3166-1 alpha-2 country and ISO 3166-2 region code.
export const COUNTRY_CODES = COUNTRIES.map((country) => country.value);
export const REGION_CODES = Object.values(REGIONS).flatMap((regions) =>
  regions.map((region) => region.value),
);

// The fixed lists, as the Profile stores them.
export const FIXED_LISTS: Record<string, readonly string[]> = {
  countryOfResidence: COUNTRY_CODES,
  region: REGION_CODES,
  homeState: STATES,
  residenceStatus: ['citizen', 'permanent_resident', 'visa'],
  citizenshipCountry: COUNTRY_CODES,
  schoolType: ['government', 'aided', 'private'],
  citizenship: ['indian', 'oci', 'other'],
  board: [
    'cbse',
    'cisce',
    'state',
    'cambridge',
    'ib',
    'us_high_school',
    'other',
  ],
  stream: ['science', 'commerce', 'arts', 'not_chosen'],
  fieldOfStudy: [
    'engineering',
    'medicine',
    'science',
    'computing',
    'commerce',
    'law',
    'arts',
    'social_sciences',
    'design',
    'agriculture',
    'education',
    'other',
  ],
  destination: COUNTRY_CODES,
  gender: ['female', 'male', 'other'],
  category: ['general', 'sc', 'st', 'obc', 'ews', 'ebc', 'dnt'],
  parentOccupation: [
    'defence',
    'central_armed_police',
    'construction_worker',
    'beedi_cine_mine_worker',
    'none',
  ],
  examsQualified: ['nmms', 'olympiad', 'other'],
} satisfies {
  [K in keyof Profile]?:
    readonly NonNullable<Profile[K]>[] | readonly ArrayElement<Profile[K]>[];
};

type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

// Criterion fields a source states as yes or no. Boards upcoming is a yes /
// no answer too, but never a Criterion.
export const YES_NO_CRITERION_FIELDS = [
  'minority',
  'disability',
  'singleGirlChild',
  'destinationIsResidence',
];
// Fields holding ISO codes, which a source or the LLM may write in any case.
const ISO_CODE_FIELDS = [
  'countryOfResidence',
  'region',
  'citizenshipCountry',
  'destination',
];

// The value a Criterion stores for a raw value a rule found, or undefined
// when it falls outside the field's fixed list (the Criterion is dropped).
export function normaliseValue(
  field: string,
  op: 'eq' | 'in' | 'lte' | 'gte',
  raw: string | string[],
): unknown {
  if (field === 'incomeBand') {
    if (typeof raw !== 'string') return undefined;
    // A bare figure ("250000", as the LLM, a reviewer or a JSON number
    // writes it) is rupees.
    return toRupees(/^\d[\d,]*$/.test(raw.trim()) ? `₹${raw.trim()}` : raw);
  }
  if (field === 'incomeAmount') {
    if (typeof raw !== 'string') return undefined;
    // The LLM or a reviewer may write the code in lower case ("sgd 70000").
    const tidy = raw
      .trim()
      .replace(/^[a-z]{3}\b/i, (code) => code.toUpperCase());
    return toIncomeLimit(tidy);
  }
  if (field === 'class') {
    const levels = [
      ...new Set(
        asList(raw)
          .map(toClass)
          .filter((l) => l !== undefined),
      ),
    ].sort((a, b) => a - b);
    return levels.length ? levels : undefined;
  }
  if (isBoardMarksField(field)) {
    return toBoardResult(field, raw);
  }
  if (field === 'atar' || field === 'sat') {
    return toTestScore(field, raw);
  }
  if (ISO_CODE_FIELDS.includes(field)) {
    const codes = asList(raw).map((code) => code.trim().toUpperCase());
    return oneOf(codes, FIXED_LISTS[field], op);
  }
  if (YES_NO_CRITERION_FIELDS.includes(field)) {
    if (raw === 'yes') return true;
    return raw === 'no' ? false : undefined;
  }
  const allowed = FIXED_LISTS[field];
  return allowed && oneOf(raw, allowed, op);
}

// A minimum ATAR ("99.90") or SAT score ("1400", "1,400"), dropped when it
// is outside the score's range or no minimum at all.
function toTestScore(
  field: TestScoreField,
  raw: string | string[],
): number | undefined {
  if (typeof raw !== 'string') return undefined;
  const text = raw.trim().replace(/,/g, '');
  if (!/^\d+(?:\.\d+)?$/.test(text)) return undefined;
  const value = Number(text);
  const [min, max] = TEST_SCORE_RANGES[field];
  return value > 0 && value >= min && value <= max ? value : undefined;
}

// A Board marks threshold, written as the rules, the LLM guide and
// reviewers write it: "60" (a percentage), "8.5 CGPA", "3.5 GPA", "36 IB
// points" or "A*AA at A-level". It is dropped when the scale isn't one its
// slot takes (SLOT_SCALES) or the value is outside the scale.
function toBoardResult(
  field: BoardMarksField,
  raw: string | string[],
): BoardResult | undefined {
  if (typeof raw !== 'string') return undefined;
  const result = readBoardResult(raw.trim());
  return result && SLOT_SCALES[field].includes(result.scale)
    ? result
    : undefined;
}

const NUMBER_ON_SCALE: [Exclude<ResultScale, 'a_level'>, RegExp][] = [
  ['percentage', /^(\d+(?:\.\d+)?)$/],
  ['cgpa_10', /^(\d+(?:\.\d+)?)\s*CGPA$/i],
  ['gpa_4', /^(\d+(?:\.\d+)?)\s*GPA$/i],
  ['ib_points', /^(\d+)\s*IB points?$/i],
];
const A_LEVEL_RESULT = /^((?:A\*|[A-E])+)(?:\s+at\s+A-levels?)?$/;

function readBoardResult(text: string): BoardResult | undefined {
  const grades = text.match(A_LEVEL_RESULT);
  if (grades) {
    const value = [...grades[1].matchAll(/A\*|[A-E]/g)].map(
      (m) => m[0] as ALevelGrade,
    );
    return { scale: 'a_level', value };
  }
  for (const [scale, pattern] of NUMBER_ON_SCALE) {
    const m = text.match(pattern);
    if (!m) continue;
    const value = Number(m[1]);
    const [, max] = RESULT_SCALE_RANGES[scale];
    return value > 0 && value <= max ? { scale, value } : undefined;
  }
  return undefined;
}

function oneOf(
  raw: string | string[],
  allowed: readonly string[],
  op: 'eq' | 'in' | 'lte' | 'gte',
): unknown {
  const values = asList(raw).filter((v) => allowed.includes(v));
  if (op === 'eq') return values.length === 1 ? values[0] : undefined;
  return values.length ? [...new Set(values)] : undefined;
}

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];
const MONTH = String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`;
const DAY = String.raw`(\d{1,2})(?:st|nd|rd|th)?`;
// A date as Indian sources write it: "31-10-2026", "31/10/2026",
// "2026-10-31", "15th October, 2026", "October 15, 2026".
export const DATE = new RegExp(
  [
    String.raw`\b(\d{4})-(\d{2})-(\d{2})\b`,
    String.raw`\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b`,
    String.raw`\b${DAY}\s+${MONTH},?\s+(\d{4})\b`,
    String.raw`\b${MONTH}\s+${DAY},?\s+(\d{4})\b`,
  ].join('|'),
  'i',
);

// The ISO date (YYYY-MM-DD) of the first date in a text, day before month
// as in India, or undefined when there is no real date.
export function toIsoDate(text: string): string | undefined {
  const m = text.match(DATE);
  if (!m) return undefined;
  const month = (name: string) =>
    MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
  const [y, mo, d] = m[1]
    ? [m[1], m[2], m[3]].map(Number)
    : m[4]
      ? [m[6], m[5], m[4]].map(Number)
      : m[7]
        ? [Number(m[9]), month(m[8]), Number(m[7])]
        : [Number(m[12]), month(m[10]), Number(m[11])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d)
    return undefined;
  return date.toISOString().slice(0, 10);
}

// Rupees from a money figure, with lakh and crore multiplied out.
export function toRupees(text: string): number | undefined {
  const m = text.match(MONEY);
  if (!m) return undefined;
  const number = Number((m[1] ?? m[3]).replace(/,/g, ''));
  const unit = (m[2] ?? m[4] ?? '').toLowerCase();
  if (!Number.isFinite(number) || number <= 0) return undefined;
  if (unit.startsWith('crore')) return Math.round(number * CRORE);
  if (unit.startsWith('la')) return Math.round(number * LAKH);
  return number;
}

// Signs that name one currency. A bare "$" is left out: Canada, Australia,
// Singapore and the US all write it.
const CURRENCY_SIGNS: Record<string, string> = {
  US$: 'USD',
  C$: 'CAD',
  A$: 'AUD',
  S$: 'SGD',
  NZ$: 'NZD',
  HK$: 'HKD',
  '£': 'GBP',
  '€': 'EUR',
};
// A currency sign or an upper-case ISO 4217 code, then a figure:
// "US$ 5000", "£62,215", "AED 250,000".
export const FOREIGN_MONEY =
  /([A-Z]{1,2}\$|£|€|\b[A-Z]{3}\b)\s*\(?\s*(\d[\d,]*(?:\.\d+)?)/g;
const MONTHLY = /\bmonth(?:ly)?\b|\bper mensem\b/i;

// How often an income limit is counted: monthly when the text says so, else
// yearly, as income limits usually are.
export function incomePeriod(text: string): IncomePeriod {
  return MONTHLY.test(text) ? 'monthly' : 'yearly';
}

// An income limit in a currency other than rupees, from the first figure
// with a currency in the text: monthly when the text says so, else yearly.
// Rupee limits are rupee band limits (incomeBand), never these.
export function toIncomeLimit(text: string): IncomeLimit | undefined {
  for (const [, sign, figure] of text.matchAll(FOREIGN_MONEY)) {
    const currency =
      CURRENCY_SIGNS[sign] ??
      (CURRENCY_CODES.includes(sign) ? sign : undefined);
    if (currency === undefined) continue;
    const value = Number(figure.replace(/,/g, ''));
    if (currency === RUPEES || !(value > 0)) return undefined;
    return { currency, period: incomePeriod(text), value };
  }
  return undefined;
}
