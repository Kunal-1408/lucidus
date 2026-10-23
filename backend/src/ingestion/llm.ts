// The LLM the Extractor asks for what its rules missed. Called only during
// ingestion, never at match time (ADR-0001). Injected so tests fake it.
export const LLM_CLIENT = Symbol('LLM_CLIENT');

export interface LlmClient {
  // Rejects when the call fails or the answer can't be read; the Extractor
  // then fails the whole extraction.
  read(request: LlmRequest): Promise<LlmAnswer>;
}

export interface LlmRequest {
  // A Scholarship's cleaned text, already capped (see LLM_TEXT_LIMIT).
  text: string;
  // The Profile fields the rules found no Criterion for.
  fields: string[];
  // Whether the rules found no Amount text, and no deadline.
  wantAmountText: boolean;
  wantDeadline: boolean;
}

// What the LLM read, each value with the exact sentence it came from. Code,
// not the model, decides how far to trust it.
export interface LlmAnswer {
  criteria: CriterionReading[];
  extraRequirements: { text: string; quote: string }[];
  // Each as the source wrote it, or null when the text doesn't state one.
  amountText: Quoted | null;
  deadline: Quoted | null;
}

// A Criterion as read off the page, by the LLM or by a reviewer writing an
// Override: the field, its raw values and the sentence they come from.
export interface CriterionReading {
  field: string;
  // The raw option(s) as the fixed list names them ("sc", "yes"), a class
  // ("11"), a percentage ("60") or a money figure ("Rs. 2.5 lakh").
  values: string[];
  quote: string;
}

export interface Quoted {
  value: string;
  quote: string;
}

// About 15,000 characters of a Scholarship's text go to the LLM; scheme
// pages state eligibility well before that.
export const LLM_TEXT_LIMIT = 15_000;
