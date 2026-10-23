import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMOUNT_NOT_STATED, extractByRules } from './extractor.js';
import { cleanHtml } from './fetcher.js';

// Seam 3: the Extractor as a pure function over a Scholarship's cleaned text,
// run against committed copies of real official pages.
const FIXTURES = join(import.meta.dirname, '../../test/fixtures');

function page(file: string): string {
  return cleanHtml(readFileSync(join(FIXTURES, file), 'utf8'));
}

function criterion(text: string, field: string) {
  return extractByRules(text).criteria.find((c) => c.field === field);
}

describe('Extractor rules on a myScheme page (NMMSS)', () => {
  const nmmss = page('extractor/myscheme-nmmss.html');

  it('finds the income limit in rupees, never changeable', () => {
    expect(criterion(nmmss, 'incomeBand')).toEqual({
      field: 'incomeBand',
      op: 'lte',
      value: 350_000,
      changeable: false,
      sourceText: expect.stringContaining('not more than ₹3,50,000/-'),
      confidence: 'high',
    });
  });

  it('reads a class range as every class in it, changeable', () => {
    expect(criterion(nmmss, 'class')).toEqual({
      field: 'class',
      op: 'in',
      value: [9, 10, 11, 12],
      changeable: true,
      sourceText: expect.stringContaining('classes 9th to 12th'),
      confidence: 'high',
    });
  });

  it('finds the marks that name Class 10, skipping test cut-offs and earlier classes', () => {
    const marks = extractByRules(nmmss).criteria.filter((c) =>
      c.field.endsWith('Marks'),
    );
    expect(marks).toEqual([
      {
        field: 'class10Marks',
        op: 'gte',
        value: 60,
        changeable: true,
        sourceText: expect.stringContaining('60% marks in Class 10th'),
        confidence: 'high',
      },
    ]);
  });

  it('finds the school types a Student must be studying in', () => {
    expect(criterion(nmmss, 'schoolType')).toEqual(
      expect.objectContaining({
        op: 'in',
        value: ['government', 'aided'],
        changeable: false,
        confidence: 'high',
      }),
    );
  });

  it('takes the Amount text from what is paid, not the income limit', () => {
    expect(extractByRules(nmmss).amountText).toBe('₹12,000/- per annum');
  });
});

describe('Normalisation onto the fixed lists', () => {
  it.each([
    ['Annual family income should be less than Rs. 2.5 lakh.', 250_000],
    ['Family income within the limit (Rs.3 lakh for school).', 300_000],
    ['Parental income must not exceed 8 lakhs per annum.', 800_000],
    ['Total family income not exceeding INR 1.2 crore.', 12_000_000],
    ['Family income below ₹2,50,000 per year.', 250_000],
  ])('turns the income limit in "%s" into rupees', (text, rupees) => {
    expect(criterion(text, 'incomeBand')?.value).toBe(rupees);
  });

  it.each([
    ['The applicant must be a domicile of Tamil Nadu.', ['tamil_nadu']],
    [
      'Open to permanent residents of Jammu & Kashmir or Ladakh.',
      ['jammu_and_kashmir', 'ladakh'],
    ],
    ['Applicants must be domiciled in Orissa.', ['odisha']],
  ])('reads the states in "%s" as Profile slugs', (text, slugs) => {
    expect(criterion(text, 'domicileState')?.value).toEqual(slugs);
  });

  it('reads no disability Criterion from a seat reservation', () => {
    // From the CSSS guidelines on NSP: a quota, not a condition.
    const text =
      '15% seats are earmarked for SCs, 7.5% for STs and 27 % for OBCs and 5% horizontal reservation for students with Benchmark Disabilities (Disability of 40% or more) in all the categories].';
    expect(criterion(text, 'disability')).toBeUndefined();
  });

  it('still reads a scholarship reserved for students with disabilities', () => {
    const text = 'This scholarship is reserved for students with disabilities.';
    expect(criterion(text, 'disability')?.value).toBe(true);
  });

  it('reads the categories a Student must belong to', () => {
    const text =
      'Students belonging to Scheduled Caste, ST or OBC categories are eligible.';
    expect(criterion(text, 'category')?.value).toEqual(['sc', 'st', 'obc']);
  });

  it.each([
    ['Applicants must have secured 60% marks in Class 10.', 'class10Marks', 60],
    ['Students should have scored 75% marks in Class 12.', 'latestMarks', 75],
    [
      'Candidates who obtained 80% in the previous examination are eligible.',
      'latestMarks',
      80,
    ],
  ])('reads the marks in "%s" as %s', (text, field, percent) => {
    expect(criterion(text, field)?.value).toBe(percent);
    const other = field === 'class10Marks' ? 'latestMarks' : 'class10Marks';
    expect(criterion(text, other)).toBeUndefined();
  });

  it.each([
    ['a class outside Class 9–12', 'Open to students studying in Class 8.'],
    [
      'a state not on the list',
      'The applicant must be a resident of Atlantis.',
    ],
    ['a stream not on the list', 'Open to students in the vocational stream.'],
    ['marks over 100', 'Students must score a minimum of 450% marks.'],
  ])('drops %s', (_, text) => {
    expect(extractByRules(text).criteria).toEqual([]);
  });

  it.each([
    ['Last date: 31/12/2026', '2026-12-31'],
    ['Deadline 2026-11-05', '2026-11-05'],
    ['Apply by 5 Nov 2026.', '2026-11-05'],
    ['The last date to apply is November 30, 2026.', '2026-11-30'],
    ['Last date: 31/02/2026', undefined],
    [
      'Applications are open from 1 July 2026, last date 31 October 2026.',
      '2026-10-31',
    ],
    ['Portal opens 01/08/2026 and closes on 15/11/2026.', '2026-11-15'],
    ['Apply by 20 Dec 2026; results on 10 Jan 2027.', '2026-12-20'],
  ])('turns "%s" into an ISO deadline', (text, iso) => {
    expect(extractByRules(text).deadline).toBe(iso);
  });

  it('leaves the deadline and amount unstated when the text has none', () => {
    const { deadline, amountText } = extractByRules(
      'Open to girls in Class 11.',
    );
    expect(deadline).toBeUndefined();
    expect(amountText).toBe(AMOUNT_NOT_STATED);
  });
});

describe('Extractor rules on a corporate page (Santoor)', () => {
  const santoor = extractByRules(page('santoor-scholarship.html'));

  it('finds only the girls-only and Class 12 Criteria the page states', () => {
    expect(santoor.criteria).toEqual([
      {
        field: 'gender',
        op: 'eq',
        value: 'female',
        changeable: false,
        sourceText: expect.stringContaining('Women’s Scholarship'),
        confidence: 'high',
      },
      {
        field: 'class',
        op: 'in',
        value: [12],
        changeable: true,
        sourceText: expect.stringContaining('after grade 12'),
        confidence: 'high',
      },
    ]);
  });

  it('finds the Amount text and turns the last date into an ISO deadline', () => {
    expect(santoor.amountText).toBe('Rs. 30,000 per annum');
    expect(santoor.deadline).toBe('2026-10-15');
  });
});

describe('Extractor rules on an NSP page', () => {
  // The NSP scheme list; one scheme's section runs from its name to its FAQ
  // link.
  const lines = page('extractor/nsp-all-scholarships.html').split('\n');
  function section(name: string): string {
    const start = lines.indexOf(name);
    if (start < 0) throw new Error(`No NSP section ${name}`);
    return lines.slice(start, lines.indexOf('FAQ', start) + 1).join('\n');
  }

  it('takes the deadline from the student application date, not the opening date', () => {
    const nmms = section(
      'National Means Cum Merit Scholarship (Merit Based Scheme)',
    );
    expect(extractByRules(nmms).deadline).toBe('2026-10-31');
  });

  it.each([
    [
      'Scholarship For Top Class Education For Students With Disabilities (Welfare Based Scheme)',
      { field: 'disability', op: 'eq', value: true },
    ],
    [
      "Prime Minister'S Scholarship Scheme For Central Armed Police Forces And Assam Rifles (Merit Based Scheme)",
      { field: 'parentOccupation', op: 'in', value: ['central_armed_police'] },
    ],
    [
      'AICTE - Pragati Scholarship Scheme For Girl Students ( Technical Degree) (Merit Based Scheme)',
      { field: 'gender', op: 'eq', value: 'female' },
    ],
  ])('finds the fixed-list Criterion in %s', (name, expected) => {
    expect(extractByRules(section(name)).criteria).toEqual([
      {
        ...expected,
        changeable: false,
        sourceText: name,
        confidence: 'high',
      },
    ]);
  });
});

describe('Extractor rules on an NSP guideline PDF (Top Class Education for SC)', () => {
  // The PDF's text as the Fetcher reads it: lines wrap mid-sentence.
  const guidelines = extractByRules(
    readFileSync(
      join(FIXTURES, 'extractor/nsp-top-class-sc-guidelines.txt'),
      'utf8',
    ),
  );

  it('reads an income limit whose unit wraps onto the next line', () => {
    expect(guidelines.criteria.find((c) => c.field === 'incomeBand')).toEqual(
      expect.objectContaining({
        op: 'lte',
        value: 800_000,
        sourceText: expect.stringContaining('up to Rs. 8.00 lakh and having'),
      }),
    );
  });

  it('keeps the lakh and the decimals in the Amount text', () => {
    expect(guidelines.amountText).toBe('Rs. 2.00 lakh per annum');
  });

  it('keeps list items apart, each its own condition', () => {
    const text = [
      'The following students are eligible:',
      'a. family income up to Rs. 2.5 lakh',
      'b. belonging to SC category',
    ].join('\n');
    expect(criterion(text, 'incomeBand')?.sourceText).toBe(
      'family income up to Rs. 2.5 lakh',
    );
  });
});
