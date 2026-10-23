import type {
  Criterion,
  ExtraRequirement,
} from '../scholarships/scholarship.schema.js';
import {
  deadlineText,
  FIELD_RULES,
  Found,
  isEligibilitySentence,
} from './extraction-rules.js';
import {
  type Quoted,
  type LlmClient,
  type LlmCriterion,
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
    fields: Object.keys(LLM_FIELDS).filter((f) => !found.has(f)),
    wantAmountText: byRules.amountText === AMOUNT_NOT_STATED,
    wantDeadline: byRules.deadline === undefined,
  });
  const fromLlm = answer.criteria
    .filter((c) => c.field in LLM_FIELDS && !found.has(c.field))
    .map((c) => fromLlmCriterion(c, text));
  // Extra requirements are never matched, so one whose sentence isn't on the
  // page is simply dropped rather than shown.
  const extraRequirements = answer.extraRequirements
    .filter((r) => r.text.trim() && quotedIn(text, r.quote))
    .map((r) => ({ text: r.text.trim(), sourceText: r.quote }));
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
    extraRequirements: [],
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

// The fields the LLM may give a Criterion for, with the op and
// changeability the code (not the model) sets for each, as the rules do.
export const LLM_FIELDS: Record<
  string,
  { op: Criterion['op']; changeable: boolean }
> = {
  class: { op: 'in', changeable: true },
  class10Marks: { op: 'gte', changeable: true },
  latestMarks: { op: 'gte', changeable: true },
  incomeBand: { op: 'lte', changeable: false },
  gender: { op: 'in', changeable: false },
  category: { op: 'in', changeable: false },
  minority: { op: 'eq', changeable: false },
  disability: { op: 'eq', changeable: false },
  singleGirlChild: { op: 'eq', changeable: false },
  citizenship: { op: 'in', changeable: false },
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

// An LLM value is medium Confidence when it passes the quote check;
// otherwise it is kept, as the model gave it, at low Confidence, which
// sends the Scholarship to review.
function fromLlmCriterion(c: LlmCriterion, text: string): Criterion {
  const checked = checkQuoted(c, text);
  if (checked.ok) return { ...checked.criterion, confidence: 'medium' };
  const { op, changeable } = LLM_FIELDS[c.field];
  return {
    field: c.field,
    op,
    value: c.values,
    changeable,
    sourceText: c.quote,
    confidence: 'low',
  };
}

export type QuoteCheck =
  | { ok: true; criterion: Omit<Criterion, 'confidence'> }
  | { ok: false; problem: string };

// The quote check for a Criterion read off the page, by the LLM or by a
// reviewer in an Override: its sentence must be in the text and every value
// it names must be an allowed option. Op and changeability are set by the
// code (LLM_FIELDS), never by whoever read it.
export function checkQuoted(c: LlmCriterion, text: string): QuoteCheck {
  const { op, changeable } = LLM_FIELDS[c.field];
  if (!quotedIn(text, c.quote)) {
    return { ok: false, problem: `${c.field}: sentence not in the page text` };
  }
  const value = llmValue(c.field, op, c.values);
  if (value === undefined) {
    return {
      ok: false,
      problem: `${c.field}: values outside the allowed options`,
    };
  }
  return {
    ok: true,
    criterion: { field: c.field, op, value, changeable, sourceText: c.quote },
  };
}

// The normalised value, or undefined unless every raw value is an allowed
// option (a list field must not quietly lose one of the values it named).
function llmValue(
  field: string,
  op: Criterion['op'],
  values: string[],
): unknown {
  const raw = values.map((v) => tidyLlmRaw(field, v.trim()));
  if (raw.length === 0) return undefined;
  if (op !== 'in') {
    return raw.length === 1 ? normaliseValue(field, op, raw[0]) : undefined;
  }
  if (raw.some((v) => normaliseValue(field, op, [v]) === undefined))
    return undefined;
  return normaliseValue(field, op, raw);
}

// The model writes some values more plainly than sources do: a bare rupee
// figure ("250000") or a percentage with its sign ("60%").
function tidyLlmRaw(field: string, raw: string): string {
  if (field === 'incomeBand' && /^\d[\d,]*$/.test(raw)) return `₹${raw}`;
  if (field.endsWith('Marks')) return raw.replace(/\s*%$/, '');
  return raw;
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

function splitSentences(text: string): string[] {
  return text
    .split('\n')
    .flatMap((line) => line.split(SENTENCE_END))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const AMOUNT =
  /(?:₹|\bRs\.?|\bINR)\s*[\d,]+(?:\/-)?(?:\s*(?:per|a|\/)\s*(?:annum|year|month))?/i;

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
