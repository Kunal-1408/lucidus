import {
  CRITERION_FIELDS,
  EXTRACTED_FIELDS,
  isBoardMarksField,
  isLegacyMarksField,
} from '../scholarships/criterion-fields.js';
import type {
  Criterion,
  ExtraRequirement,
} from '../scholarships/scholarship.schema.js';
import {
  deadlineText,
  FIELD_RULES,
  Found,
  isEligibilitySentence,
  otherYearMarks,
} from './extraction-rules.js';
import {
  type Quoted,
  type LlmClient,
  type CriterionReading,
  LLM_TEXT_LIMIT,
} from './llm.js';
import { normaliseValue, toIsoDate } from './normalise.js';

export interface Extraction {
  criteria: Criterion[];
  extraRequirements: ExtraRequirement[];
  amountText: string;
  // ISO date (YYYY-MM-DD); absent when the source doesn't state one.
  deadline?: string;
}

export const AMOUNT_NOT_STATED = 'See the official site for the amount';

// Extracts a Scholarship from its cleaned text. The pipeline:
// sentence filter → regex rules → one LLM call over the full cleaned text
// for what the rules missed → normalisation → quote check → Confidence.
// Any LLM failure fails the whole extraction, so nothing partial is stored.
export async function extract(
  text: string,
  llm: LlmClient,
): Promise<Extraction> {
  const byRules = extractByRules(text);
  const found = new Set(byRules.criteria.map((c) => c.field));
  const answer = await llm.read({
    text: text.slice(0, LLM_TEXT_LIMIT),
    fields: EXTRACTED_FIELDS.filter((f) => !found.has(f)),
    wantAmountText: byRules.amountText === AMOUNT_NOT_STATED,
    wantDeadline: byRules.deadline === undefined,
  });
  const fromLlm = answer.criteria
    .filter((c) => EXTRACTED_FIELDS.includes(c.field) && !found.has(c.field))
    .map((reading) => fromCriterionReading(reading, text));
  // Extra requirements are never matched, so one whose sentence isn't on the
  // page is simply dropped rather than shown.
  // The rules' own Extra requirements come first; the LLM's copy of the same
  // sentence is dropped.
  const ruleQuotes = byRules.extraRequirements.map((r) => r.sourceText);
  const extraRequirements = [
    ...byRules.extraRequirements,
    ...answer.extraRequirements
      .filter((r) => r.text.trim() && quotedIn(text, r.quote))
      .filter((r) => !ruleQuotes.some((quote) => quotedIn(quote, r.quote)))
      .map((r) => ({ text: r.text.trim(), sourceText: r.quote })),
  ];
  const amountText =
    byRules.amountText !== AMOUNT_NOT_STATED
      ? byRules.amountText
      : (quotedValue(text, answer.amountText) ?? AMOUNT_NOT_STATED);
  const llmDeadline = quotedValue(text, answer.deadline);
  const deadline = byRules.deadline ?? (llmDeadline && toIsoDate(llmDeadline));
  return {
    criteria: [...byRules.criteria, ...fromLlm],
    extraRequirements,
    amountText,
    deadline,
  };
}

// The rules alone: they see only the eligibility sentences; whatever they
// find is normalised onto the fixed lists (values outside them are dropped)
// and, being a regex match, is high Confidence.
export function extractByRules(text: string): Extraction {
  const sentences = splitSentences(text);
  const eligibility = sentences.filter(isEligibilitySentence);
  const found = FIELD_RULES.flatMap((rule) => rule(eligibility) ?? []);
  const criteria = found
    .map(normalise)
    .filter((c): c is Omit<Criterion, 'confidence'> => c !== undefined)
    .map((c) => ({ ...c, confidence: 'high' as const }));
  const deadline = deadlineText(sentences);
  return {
    criteria,
    extraRequirements: otherYearMarks(eligibility),
    amountText: amountRule(sentences) ?? AMOUNT_NOT_STATED,
    deadline: deadline && toIsoDate(deadline),
  };
}

function normalise(found: Found): Omit<Criterion, 'confidence'> | undefined {
  const value = normaliseValue(found.field, found.op, found.raw);
  if (value === undefined) return undefined;
  const { field, op, changeable, sourceText } = found;
  return { field, op, value, changeable, sourceText };
}

// An LLM value is medium Confidence when it passes the quote check;
// otherwise it is kept at low Confidence, which sends the Scholarship to
// review. A low Criterion's value is always the model's raw values as given,
// which approving it normalises (see approvedValue).
function fromCriterionReading(
  reading: CriterionReading,
  text: string,
): Criterion {
  const checked = checkQuoted(reading, text);
  if (checked.ok) return { ...checked.criterion, confidence: 'medium' };
  return {
    field: reading.field,
    ...CRITERION_FIELDS[reading.field],
    value: reading.values,
    sourceText: reading.quote,
    confidence: 'low',
  };
}

// The value a low Criterion goes live with once a reviewer approves it, or
// undefined when its raw values aren't all allowed options (such a
// Criterion can't be compared with any Profile).
export function approvedValue(criterion: Criterion): unknown {
  if (criterion.confidence !== 'low') return criterion.value;
  const { field, value } = criterion;
  const raw = Array.isArray(value) ? value : [value];
  return raw.every((v) => typeof v === 'string')
    ? readValue(field, raw)
    : undefined;
}

export type QuoteCheck =
  | { ok: true; criterion: Omit<Criterion, 'confidence'> }
  | { ok: false; problem: string };

// The quote check for a Criterion read off the page, by the LLM or by a
// reviewer in an Override: its sentence must be in the text and every value
// it names must be an allowed option. Op and changeability are set by the
// code (CRITERION_FIELDS), never by whoever read it.
export function checkQuoted(
  reading: CriterionReading,
  text: string,
): QuoteCheck {
  const { field, values, quote } = reading;
  if (!quotedIn(text, quote)) {
    return { ok: false, problem: `${field}: sentence not in the page text` };
  }
  const value = readValue(field, values);
  if (value === undefined) {
    return {
      ok: false,
      problem: `${field}: values outside the allowed options`,
    };
  }
  return {
    ok: true,
    criterion: { field, ...CRITERION_FIELDS[field], value, sourceText: quote },
  };
}

// The normalised value of values read off the page (by the LLM or a
// reviewer), or undefined unless every one is an allowed option (a list
// field must not quietly lose one of the values it named).
export function readValue(field: string, values: string[]): unknown {
  const { op } = CRITERION_FIELDS[field];
  const raw = values.map((v) => tidyReadValue(field, v.trim()));
  if (raw.length === 0) return undefined;
  if (op !== 'in') {
    return raw.length === 1 ? normaliseValue(field, op, raw[0]) : undefined;
  }
  if (raw.some((v) => normaliseValue(field, op, [v]) === undefined))
    return undefined;
  return normaliseValue(field, op, raw);
}

// The model and reviewers write a percentage with its sign ("60%").
function tidyReadValue(field: string, raw: string): string {
  return isBoardMarksField(field) || isLegacyMarksField(field)
    ? raw.replace(/\s*%$/, '')
    : raw;
}

// A value the model says the source states, kept only when the value sits
// inside its quote and the quote is in the text.
function quotedValue(text: string, quoted: Quoted | null): string | undefined {
  if (!quoted || !quotedIn(text, quoted.quote)) return undefined;
  const value = quoted.value.trim();
  return value && quotedIn(quoted.quote, value) ? value : undefined;
}

// Whether a quote appears verbatim in the text; line breaks and runs of
// spaces count as one space, since cleaning reflows the page.
function quotedIn(text: string, quote: string): boolean {
  const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
  const q = squash(quote);
  return q.length > 0 && squash(text).includes(q);
}

// A full stop ends a sentence unless it ends an abbreviation ("Rs. 30,000").
const SENTENCE_END =
  /(?<!\b(?:Rs|No|Nos|Std|Dr|Mr|Mrs|Ms|Smt|Shri|viz|approx)\.)(?<=[.!?])\s+/i;

// A line starting in lower case carries on the sentence above it: PDFs wrap
// their lines mid-sentence ("up to Rs. 8.00" / "lakh and having ..."). A
// line after a full stop, colon or semicolon, or one starting a list item
// ("a. ...", "iv) ..."), begins a condition of its own.
const WRAPPED_LINE = /(?<![.:;!?])\n(?=\p{Ll})(?!(?:[a-z]|[ivx]+)[.)]\s)/gu;

// A line starting with a capital or a digit carries on the sentence above
// only when that line ends in a comma or a word no sentence ends on ("from
// Class" / "9 onwards", "Board of" / "Education"). Otherwise it may be a
// heading ("3. Allocation of Scholarship") or a sentence of its own, and a
// numbered or lettered list item ("2. ELIGIBILITY:") never carries on.
const WRAPPED_AFTER_DANGLING_WORD =
  /(?<=,|\b(?:of|the|a|an|and|or|from|to|in|on|at|for|by|with|including|as|than|under|Class|Grade|Standard))\n(?=[\p{Lu}\d])(?!(?:\d+|[A-Z]|[IVX]+)[.)]\s)/gu;

function splitSentences(text: string): string[] {
  return text
    .replace(WRAPPED_LINE, ' ')
    .replace(WRAPPED_AFTER_DANGLING_WORD, ' ')
    .split('\n')
    .flatMap((line) => line.split(SENTENCE_END))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const AMOUNT =
  /(?:₹|\bRs\.?|\bINR)\s*[\d,]+(?:\.\d+)?(?:\s*(?:lakhs?|crores?)\b)?(?:\/-)?(?:\s*(?:per|a|\/)\s*(?:annum|year|month))?/i;

// The first figure stated as what is paid; an income limit is not an amount.
function amountRule(sentences: string[]): string | undefined {
  for (const sentence of sentences) {
    if (/\bincome\b/i.test(sentence)) continue;
    const m = sentence.match(AMOUNT);
    if (m) return m[0];
  }
  return undefined;
}

// The Extractor as Ingestion sees it, injected so tests can swap it.
export const EXTRACTOR = Symbol('EXTRACTOR');

export interface Extractor {
  extract(text: string): Promise<Extraction>;
}

// The Extractor Ingestion uses: rules first, then the LLM.
export function llmExtractor(llm: LlmClient): Extractor {
  return { extract: (text) => extract(text, llm) };
}
