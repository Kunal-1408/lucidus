import { AMOUNT_NOT_STATED, extract } from './extractor.js';
import type { LlmAnswer, LlmClient, LlmRequest } from './llm.js';

// Seam 3: the Extractor as a pure function with the LLM injected. The fake
// LLM answers what each test gives it and records what it was asked.
function fakeLlm(answer: Partial<LlmAnswer> | Error) {
  const requests: LlmRequest[] = [];
  const llm: LlmClient = {
    read: (request) => {
      requests.push(request);
      if (answer instanceof Error) return Promise.reject(answer);
      return Promise.resolve({
        criteria: [],
        extraRequirements: [],
        amountText: null,
        deadline: null,
        ...answer,
      });
    },
  };
  return { llm, requests };
}

// A page whose rules find gender and class only.
const PAGE = [
  'Scholarship for meritorious girls.',
  'Open to girls studying in Class 11.',
  'Meant for those who plan to pursue engineering after school.',
  'Applicants must rank in the top 1% of their board.',
].join('\n');

const ENGINEERING = {
  field: 'fieldOfStudy',
  values: ['engineering'],
  quote: 'Meant for those who plan to pursue engineering after school.',
};

describe('Extractor with the LLM for what the rules miss', () => {
  it('takes a field the rules missed from the LLM at medium Confidence when its quote is verbatim', async () => {
    const { llm } = fakeLlm({ criteria: [ENGINEERING] });
    const { criteria } = await extract(PAGE, llm);
    expect(criteria.find((c) => c.field === 'fieldOfStudy')).toEqual({
      field: 'fieldOfStudy',
      op: 'in',
      value: ['engineering'],
      changeable: false,
      sourceText: ENGINEERING.quote,
      confidence: 'medium',
    });
  });

  it.each([
    [
      'its quote is not in the text',
      { ...ENGINEERING, quote: 'Open only to engineering aspirants.' },
    ],
    [
      'a value is not an allowed option',
      { ...ENGINEERING, values: ['engineering', 'aviation'] },
    ],
  ])('keeps an LLM value at low Confidence when %s', async (_, given) => {
    const { llm } = fakeLlm({ criteria: [given] });
    const { criteria } = await extract(PAGE, llm);
    expect(criteria.find((c) => c.field === 'fieldOfStudy')).toEqual(
      expect.objectContaining({ sourceText: given.quote, confidence: 'low' }),
    );
  });

  it('accepts a quote whose line breaks differ from the text', async () => {
    const quote =
      'Meant for those who plan\n to pursue engineering after school.';
    const { llm } = fakeLlm({ criteria: [{ ...ENGINEERING, quote }] });
    const { criteria } = await extract(PAGE, llm);
    const fieldOfStudy = criteria.find((c) => c.field === 'fieldOfStudy');
    expect(fieldOfStudy?.confidence).toBe('medium');
  });

  it('normalises LLM values onto the fixed lists: rupees, classes, marks', async () => {
    const income = 'Family income must be within two and a half lakh.';
    const level = 'For students of the eleventh standard.';
    const marks = 'Needs sixty percent in the last exam.';
    const { llm } = fakeLlm({
      criteria: [
        { field: 'incomeBand', values: ['2.5 lakh'], quote: income },
        { field: 'class', values: ['XI'], quote: level },
        { field: 'latestMarks', values: ['60%'], quote: marks },
      ],
    });
    const { criteria } = await extract([income, level, marks].join('\n'), llm);
    expect(
      criteria.map(({ field, op, value, changeable }) => ({
        field,
        op,
        value,
        changeable,
      })),
    ).toEqual([
      { field: 'incomeBand', op: 'lte', value: 250_000, changeable: false },
      { field: 'class', op: 'in', value: [11], changeable: true },
      { field: 'latestMarks', op: 'gte', value: 60, changeable: true },
    ]);
  });

  it("asks the LLM once, only for the fields the rules missed, and keeps the rules' value", async () => {
    const { llm, requests } = fakeLlm({
      criteria: [
        {
          field: 'gender',
          values: ['male'],
          quote: 'Scholarship for meritorious girls.',
        },
      ],
    });
    const { criteria } = await extract(PAGE, llm);
    expect(requests).toHaveLength(1);
    expect(requests[0].fields).not.toContain('gender');
    expect(requests[0].fields).not.toContain('class');
    expect(requests[0].fields).toContain('fieldOfStudy');
    expect(criteria.filter((c) => c.field === 'gender')).toEqual([
      expect.objectContaining({ value: 'female', confidence: 'high' }),
    ]);
  });

  it('sends the full cleaned text, capped near 15,000 characters', async () => {
    const { llm, requests } = fakeLlm({});
    const long = `${PAGE}\n${'More about the scholarship. '.repeat(1_000)}`;
    await extract(long, llm);
    expect(requests[0].text.startsWith(PAGE)).toBe(true);
    expect(requests[0].text.length).toBe(15_000);
  });

  it('fails the whole extraction when the LLM call fails', async () => {
    const { llm } = fakeLlm(new Error('overloaded'));
    await expect(extract(PAGE, llm)).rejects.toThrow('overloaded');
  });
});

describe('Extra requirements', () => {
  it('keeps a condition no Profile field answers, with its sentence', async () => {
    const quote = 'Applicants must rank in the top 1% of their board.';
    const { llm } = fakeLlm({
      extraRequirements: [{ text: 'Top 1% in your board', quote }],
    });
    expect((await extract(PAGE, llm)).extraRequirements).toEqual([
      { text: 'Top 1% in your board', sourceText: quote },
    ]);
  });

  it('drops one whose sentence is not in the text', async () => {
    const { llm } = fakeLlm({
      extraRequirements: [
        { text: 'Must be an orphan', quote: 'Only orphans may apply.' },
      ],
    });
    expect((await extract(PAGE, llm)).extraRequirements).toEqual([]);
  });
});

describe('Amount text and deadline fallback', () => {
  const paid = 'Winners receive full tuition for two years.';
  const closes = 'Submit the form no later than 15 November 2026.';
  const text = ['Open to girls studying in Class 11.', paid, closes].join('\n');
  const stated =
    'Girls in Class 11 get ₹10,000 per month. Last date: 31/12/2026';

  it('asks the LLM for them only when the rules found none', async () => {
    const { llm, requests } = fakeLlm({});
    await extract(text, llm);
    await extract(stated, llm);
    expect(requests.map((r) => [r.wantAmountText, r.wantDeadline])).toEqual([
      [true, true],
      [false, false],
    ]);
  });

  it('takes them from the LLM when the value is in its quote and the quote is in the text', async () => {
    const { llm } = fakeLlm({
      amountText: { value: 'full tuition for two years', quote: paid },
      deadline: { value: '15 November 2026', quote: closes },
    });
    expect(await extract(text, llm)).toEqual(
      expect.objectContaining({
        amountText: 'full tuition for two years',
        deadline: '2026-11-15',
      }),
    );
  });

  it.each([
    [
      'the quote is not in the text',
      { value: 'full tuition', quote: 'Winners get full tuition.' },
      {
        value: '15 November 2026',
        quote: 'Closes 15 November 2026.',
      },
    ],
    [
      'the value is not in the quote',
      { value: '₹50,000', quote: paid },
      { value: '1 December 2026', quote: closes },
    ],
    [
      'the deadline is not a date',
      { value: '', quote: '' },
      { value: 'no later than', quote: closes },
    ],
  ])('ignores them when %s', async (_, amountText, deadline) => {
    const { llm } = fakeLlm({ amountText, deadline });
    const extraction = await extract(text, llm);
    expect(extraction.amountText).toBe(AMOUNT_NOT_STATED);
    expect(extraction.deadline).toBeUndefined();
  });

  it("keeps the rules' Amount text and deadline over the LLM's", async () => {
    const { llm } = fakeLlm({
      amountText: { value: 'Girls', quote: 'Girls in Class 11' },
      deadline: { value: 'Class 11', quote: 'Girls in Class 11' },
    });
    const extraction = await extract(stated, llm);
    expect(extraction.amountText).toBe('₹10,000 per month');
    expect(extraction.deadline).toBe('2026-12-31');
  });
});
