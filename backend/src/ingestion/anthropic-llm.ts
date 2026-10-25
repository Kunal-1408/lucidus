import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { EXTRACTED_FIELDS } from '../scholarships/criterion-fields.js';
import type { LlmAnswer, LlmClient, LlmRequest } from './llm.js';
import { FIXED_LISTS } from './normalise.js';

export const LLM_MODEL = 'claude-haiku-5-5';

// How each field's values are written, for the fields without a fixed list.
const FIELD_GUIDE: Record<string, string> = {
  class:
    'the class the Student must be in now: one value per class, each "9", "10", "11" or "12"',
  class10Result:
    'the minimum Class 10 board exam result, one percentage such as "60"',
  class12Result:
    'the minimum Class 12 board exam result, one percentage such as "75"',
  incomeBand:
    'the upper limit on annual family income in rupees, one figure as the text writes it, such as "Rs. 2.5 lakh"',
  incomeAmount:
    'the upper limit on family income in a currency other than rupees: one value, the ISO 4217 code, the figure and monthly or yearly as the text counts it, such as "USD 5000 monthly" or "GBP 62215 yearly"',
  minority: '"yes" when only minority-community students may apply',
  disability: '"yes" when only students with a disability may apply',
  singleGirlChild: '"yes" when only a single girl child may apply',
  countryOfResidence:
    'the countries the Student must live in, each an ISO 3166-1 alpha-2 code such as "AE" or "GB"; leave it out when the text only says "India"',
  region:
    'the states or regions within a country the Student must live in, each an ISO 3166-2 code such as "CA-ON" or "AE-DU"; an Indian state is homeState, never region',
  homeState: `the Indian states the Student's family must belong to (domicile, "permanent resident of" a state), one or more of: ${FIXED_LISTS.homeState.join(', ')}`,
  residenceStatus:
    'the Student\'s status in the country they live in: one or more of citizen, permanent_resident, visa (for example "citizens or permanent residents of Singapore" is citizen and permanent_resident)',
  citizenship:
    'one or more of: indian (Indian citizens, including NRIs), oci (OCI or PIO card holders), other (another nationality)',
  citizenshipCountry:
    'the countries the Student must be a citizen of, other than India, each an ISO 3166-1 alpha-2 code such as "US"',
  fieldOfStudy: `the broad groups of subjects the Student must study, one or more of: ${FIXED_LISTS.fieldOfStudy.join(', ')} (science is the natural sciences, arts is arts and humanities, other is any subject outside these groups)`,
  destination:
    'the countries the Student must study in, each an ISO 3166-1 alpha-2 code such as "GB" or "US"; leave it out when the text only says "India"',
  destinationIsResidence:
    '"yes" when only home (domestic) students of the country of study may apply, "no" when only international (overseas) students may apply',
};

function guideFor(field: string): string {
  const options = FIXED_LISTS[field];
  return FIELD_GUIDE[field] ?? `one or more of: ${options?.join(', ')}`;
}

const SYSTEM = `You read the text of one Scholarship page from an official Indian source and report what it states, for a matcher that checks a school Student's profile.

Rules:
- Report only what the text states. Never guess or infer.
- Every value comes with a quote: one sentence copied exactly, character for character, from the text, that states it. A value whose quote is not in the text is discarded.
- criteria: one entry per requested field the text restricts, using only the values allowed for that field. Leave a field out when the text doesn't restrict it.
- extraRequirements: conditions on who may apply that none of the profile fields listed can answer (for example "top 1% in your board", "not receiving another scholarship", "born after 2010"). Write each as a short phrase for the Student. Documents to submit are not requirements.
- Marks: only a Class 10 or Class 12 board exam result is a criterion. Marks required in any other year (for example Class 7 or Class 8) are extraRequirements.
- amountText: what the Scholarship pays, copied as the text words it (for example "full tuition" or "₹10,000 per month"), with its quote; null when the text doesn't say or it wasn't asked for.
- deadline: the last date a Student can apply, copied exactly as the text writes the date, with its quote; null when the text doesn't say or it wasn't asked for.`;

const QUOTED = {
  type: 'object',
  additionalProperties: false,
  required: ['value', 'quote'],
  properties: { value: { type: 'string' }, quote: { type: 'string' } },
};

// The answer's shape, the same for every call.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['criteria', 'extraRequirements', 'amountText', 'deadline'],
  properties: {
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'values', 'quote'],
        properties: {
          field: { type: 'string', enum: EXTRACTED_FIELDS },
          values: { type: 'array', items: { type: 'string' } },
          quote: { type: 'string' },
        },
      },
    },
    extraRequirements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'quote'],
        properties: { text: { type: 'string' }, quote: { type: 'string' } },
      },
    },
    amountText: { anyOf: [QUOTED, { type: 'null' }] },
    deadline: { anyOf: [QUOTED, { type: 'null' }] },
  },
};

function userMessage(request: LlmRequest): string {
  const requested = request.fields.map((f) => `- ${f}: ${guideFor(f)}`);
  const known = EXTRACTED_FIELDS.join(', ');
  return [
    'Requested fields:',
    requested.length ? requested.join('\n') : '(none)',
    '',
    `Profile fields (anything about these is never an extra requirement): ${known}.`,
    `Amount text wanted: ${request.wantAmountText ? 'yes' : 'no'}.`,
    `Deadline wanted: ${request.wantDeadline ? 'yes' : 'no'}.`,
    '',
    '<page>',
    request.text,
    '</page>',
  ].join('\n');
}

// One Claude Haiku call per new or changed Scholarship, with structured
// output in the Criterion shape. Any failure rejects, so the extraction
// fails whole.
@Injectable()
export class AnthropicLlmClient implements LlmClient {
  // Created on first use, so the app starts without a key (tests, local
  // runs that never ingest).
  private client?: Anthropic;

  async read(request: LlmRequest): Promise<LlmAnswer> {
    this.client ??= new Anthropic();
    const response = await this.client.messages.create({
      model: LLM_MODEL,
      max_tokens: 16_000,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage(request) }],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    });
    if (response.stop_reason !== 'end_turn') {
      throw new Error(`LLM stopped early: ${response.stop_reason}`);
    }
    const text = response.content.find((block) => block.type === 'text');
    if (!text) throw new Error('LLM returned no answer');
    return JSON.parse(text.text) as LlmAnswer;
  }
}
