import type { Criterion } from '../scholarships/scholarship.schema.js';
import {
  deadlineSentence,
  FIELD_RULES,
  Found,
  isEligibilitySentence,
} from './extraction-rules.js';
import { normaliseValue, toIsoDate } from './normalise.js';

export interface Extraction {
  criteria: Criterion[];
  amountText: string;
  // ISO date (YYYY-MM-DD); absent when the source doesn't state one.
  deadline?: string;
}

export const AMOUNT_NOT_STATED = 'See the official site for the amount';

// Extracts a Scholarship from its cleaned text. The pipeline:
// sentence filter → regex rules → normalisation → Confidence.
// Rules see only the eligibility sentences; whatever they find is normalised
// onto the fixed lists (values outside them are dropped) and, being a regex
// match, is high Confidence.
export function extract(text: string): Extraction {
  const sentences = splitSentences(text);
  const eligibility = sentences.filter(isEligibilitySentence);
  const found = FIELD_RULES.flatMap((rule) => rule(eligibility) ?? []);
  const criteria = found
    .map(normalise)
    .filter((c): c is Omit<Criterion, 'confidence'> => c !== undefined)
    .map((c) => ({ ...c, confidence: 'high' as const }));
  const deadline = deadlineSentence(sentences);
  return {
    criteria,
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

// The Extractor as Ingestion sees it, injected so tests (and the LLM step to
// come) can swap it. Async because extraction will call the LLM.
export const EXTRACTOR = Symbol('EXTRACTOR');

export interface Extractor {
  extract(text: string): Promise<Extraction>;
}

export const ruleExtractor: Extractor = {
  extract: (text) => Promise.resolve(extract(text)),
};
