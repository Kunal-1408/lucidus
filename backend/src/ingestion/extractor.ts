import type { Criterion } from '../scholarships/scholarship.schema.js';

export interface Extraction {
  criteria: Criterion[];
  amountText: string;
}

export const AMOUNT_NOT_STATED = 'See the official site for the amount';

const ELIGIBILITY_WORDS =
  /eligib|girls?\b|boys?\b|women|female|\bmale\b|class|grade|standard|income|category/i;

// Extracts Criteria from a scholarship's cleaned text with regex rules.
// So far only gender and class are recognised.
export function extract(text: string): Extraction {
  const sentences = splitSentences(text).filter((s) =>
    ELIGIBILITY_WORDS.test(s),
  );
  const criteria = [genderRule(sentences), classRule(sentences)].filter(
    (c): c is Criterion => c !== undefined,
  );
  return { criteria, amountText: amountRule(text) ?? AMOUNT_NOT_STATED };
}

function splitSentences(text: string): string[] {
  return text
    .split('\n')
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const FEMALE = /\b(girls?|women|female|daughters?)\b/i;
const MALE = /\b(boys?|male|sons?)\b/i;

// A source naming only girls (or only boys) gets a gender Criterion; one
// naming both, or neither, gets none.
function genderRule(sentences: string[]): Criterion | undefined {
  const female = sentences.find((s) => FEMALE.test(s));
  const male = sentences.find((s) => MALE.test(s));
  if (female && !male)
    return regexCriterion('gender', 'eq', 'female', female, false);
  if (male && !female)
    return regexCriterion('gender', 'eq', 'male', male, false);
  return undefined;
}

const CLASS_MENTION =
  /\b(?:class|grade|std\.?|standard)\s*(9|10|11|12|ix|x|xi|xii)(?:th)?\b/gi;
const ROMAN: Record<string, number> = { ix: 9, x: 10, xi: 11, xii: 12 };

// When a source names several classes, the highest is the one the Student
// must be in; the lower ones are earlier qualifications ("Passed class 10").
function classRule(sentences: string[]): Criterion | undefined {
  let best: { level: number; sentence: string } | undefined;
  for (const sentence of sentences) {
    for (const [, label] of sentence.matchAll(CLASS_MENTION)) {
      const level = ROMAN[label.toLowerCase()] ?? Number(label);
      if (!best || level > best.level) best = { level, sentence };
    }
  }
  return (
    best && regexCriterion('class', 'in', [best.level], best.sentence, true)
  );
}

const AMOUNT =
  /(?:₹|\bRs\.?|\bINR)\s*[\d,]+(?:\/-)?(?:\s*(?:per|a|\/)\s*(?:annum|year|month))?/i;

function amountRule(text: string): string | undefined {
  return text.match(AMOUNT)?.[0];
}

function regexCriterion(
  field: string,
  op: Criterion['op'],
  value: unknown,
  sourceText: string,
  changeable: boolean,
): Criterion {
  return { field, op, value, changeable, sourceText, confidence: 'high' };
}
