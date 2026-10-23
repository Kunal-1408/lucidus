// Normalisation: turns the raw values the rules (and, later, the LLM) find
// into the exact values the Matcher compares against the Profile.
import type { IndianState, Profile } from '../match/profile.js';

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

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// The fixed lists, as the Profile stores them.
const FIXED_LISTS: Record<string, readonly string[]> = {
  domicileState: STATES,
  schoolState: STATES,
  schoolType: ['government', 'aided', 'private'],
  citizenship: ['indian', 'other'],
  board: ['cbse', 'cisce', 'state', 'ib', 'cambridge', 'other'],
  stream: ['science', 'commerce', 'arts', 'not_chosen'],
  fieldOfStudy: [
    'engineering',
    'medicine',
    'science',
    'commerce',
    'arts',
    'law',
    'other',
  ],
  destination: [
    'india',
    'uk',
    'usa',
    'canada',
    'australia',
    'germany',
    'other',
  ],
  gender: ['female', 'male', 'other'],
  category: ['general', 'sc', 'st', 'obc', 'ews'],
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

const YES_NO_FIELDS = ['minority', 'disability', 'singleGirlChild'];

// The value a Criterion stores for a raw value a rule found, or undefined
// when it falls outside the field's fixed list (the Criterion is dropped).
export function normaliseValue(
  field: string,
  op: 'eq' | 'in' | 'lte' | 'gte',
  raw: string | string[],
): unknown {
  if (field === 'incomeBand') {
    return typeof raw === 'string' ? toRupees(raw) : undefined;
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
  if (field === 'class10Marks' || field === 'latestMarks') {
    return toPercent(raw);
  }
  if (YES_NO_FIELDS.includes(field)) {
    if (raw === 'yes') return true;
    return raw === 'no' ? false : undefined;
  }
  const allowed = FIXED_LISTS[field];
  return allowed && oneOf(raw, allowed, op);
}

// A percentage of marks, 0–100.
function toPercent(raw: string | string[]): number | undefined {
  const value = typeof raw === 'string' ? Number(raw) : NaN;
  return value > 0 && value <= 100 ? value : undefined;
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
