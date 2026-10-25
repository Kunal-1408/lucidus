// The contract between the Profile form and the Criteria: every value the
// form can send for a field is one that field's Criteria are written in, and
// every value a Criterion can hold is one the form can send. The frontend
// keeps its own copy of the fixed lists (there is no shared types package),
// so this test reads them straight from frontend/src/app/profile-fields.ts.
import { isDeepStrictEqual as isEqual } from 'node:util';
import * as formPlaces from '../../../frontend/src/app/countries.js';
import * as formCurrencies from '../../../frontend/src/app/currencies.js';
import * as form from '../../../frontend/src/app/profile-fields.js';
import * as rules from '../../../frontend/src/app/profile-rules.js';
import { readValue } from '../ingestion/extractor.js';
import { FIXED_LISTS, LEGACY_DESTINATIONS } from '../ingestion/normalise.js';
import { COUNTRIES, REGIONS } from '../match/countries.js';
import { COUNTRY_CURRENCIES, CURRENCIES } from '../match/currencies.js';
import { match } from '../match/matcher.js';
import {
  A_LEVEL_GRADES,
  NO_CLASS_10_EXAM_BOARDS,
  NO_CLASS_12_EXAM_BOARDS,
  type Profile,
  RESULT_SCALE_RANGES,
  SLOT_SCALES,
  STATE_REGIONS,
  TEST_SCORE_RANGES,
  type TestScoreField,
} from '../match/profile.js';
import { CRITERION_FIELDS } from './criterion-fields.js';

type FormOption = { value: string | number };

// Each Profile field the form offers a fixed list for, with that list.
const FORM_LISTS: Record<string, readonly FormOption[]> = {
  class: form.CLASSES,
  countryOfResidence: formPlaces.COUNTRIES,
  // The form offers the regions of the country picked; together, all of them.
  region: Object.values(formPlaces.REGIONS).flat(),
  homeState: form.STATES,
  residenceStatus: form.RESIDENCE_STATUSES,
  citizenshipCountry: formPlaces.COUNTRIES,
  domicileState: form.STATES,
  schoolState: form.STATES,
  schoolType: form.SCHOOL_TYPES,
  citizenship: form.CITIZENSHIPS,
  board: form.BOARDS,
  stream: form.STREAMS,
  fieldOfStudy: form.FIELDS_OF_STUDY,
  destination: formPlaces.COUNTRIES,
  incomeBand: form.INCOME_BANDS,
  gender: form.GENDERS,
  category: form.CATEGORIES,
  parentOccupation: form.PARENT_OCCUPATIONS,
  examsQualified: form.EXAMS,
};
// Fields the form asks as a yes / no question.
const YES_NO_FIELDS = ['minority', 'disability', 'singleGirlChild'];
// Board marks: fields the form asks as a result on a Result scale.
const BOARD_MARKS_FIELDS = ['class10Result', 'class12Result'];
// Fields the form asks as an amount in a currency.
const AMOUNT_FIELDS = ['incomeAmount'];
// Test scores: fields the form asks as a number in a range.
const TEST_SCORE_FIELDS: readonly TestScoreField[] = ['atar', 'sat'];

// Values deliberately on one side only, each with the reason.
const FORM_ONLY_FIELDS: Record<string, string> = {
  boardsUpcoming:
    'not a condition a Scholarship sets: it only lets a marks shortfall become a Goal',
};
const CRITERION_ONLY_FIELDS: Record<string, string> = {
  destinationIsResidence:
    'home vs international awards: the Matcher answers it by comparing destination with countryOfResidence, so the form never asks it',
  class10Marks:
    'replaced by Board marks; kept readable for stored Criteria and Overrides until ticket 09, never extracted',
  latestMarks:
    'replaced by Board marks; kept readable for stored Criteria and Overrides until ticket 09, never extracted',
};
const CRITERION_ONLY_VALUES: Record<string, Record<string, string>> = {
  parentOccupation: {
    construction_worker:
      'hidden from the form (commented out in profile-fields.ts) while extraction still reads it; a Scholarship for these Students can only ever ask or fail',
    beedi_cine_mine_worker:
      'hidden from the form (commented out in profile-fields.ts) while extraction still reads it; a Scholarship for these Students can only ever ask or fail',
  },
};

const formValues = (field: string) =>
  FORM_LISTS[field].map((option) => option.value);

// The Criterion value read for one value as the LLM, a reviewer or a JSON
// source writes it; a list field's value is a list.
function criterionValues(field: string, raw: string): unknown[] {
  const value = readValue(field, [raw]);
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

describe('Form ↔ Criteria contract', () => {
  const formFields = [
    ...Object.keys(FORM_LISTS),
    ...YES_NO_FIELDS,
    ...BOARD_MARKS_FIELDS,
    ...AMOUNT_FIELDS,
    ...TEST_SCORE_FIELDS,
  ];

  it('the form asks about every field a Criterion can check, or it is listed with a reason', () => {
    const unasked = Object.keys(CRITERION_FIELDS).filter(
      (field) =>
        !formFields.includes(field) && !(field in CRITERION_ONLY_FIELDS),
    );
    expect(unasked).toEqual([]);
    for (const field of Object.keys(CRITERION_ONLY_FIELDS)) {
      expect(formFields).not.toContain(field);
      expect(CRITERION_FIELDS).toHaveProperty(field);
    }
  });

  it('every field the form asks about is one a Criterion can check, or listed with a reason', () => {
    const unchecked = formFields.filter(
      (field) => !(field in CRITERION_FIELDS),
    );
    expect(unchecked).toEqual([]);
    for (const field of Object.keys(FORM_ONLY_FIELDS)) {
      expect(CRITERION_FIELDS).not.toHaveProperty(field);
    }
  });

  describe.each(
    Object.keys(FORM_LISTS).filter((field) => field !== 'incomeBand'),
  )('%s', (field) => {
    it('every value the form can send is in the Criterion vocabulary', () => {
      const unread = formValues(field).filter(
        (value) => !criterionValues(field, String(value)).includes(value),
      );
      expect(unread).toEqual([]);
    });

    it('every value a Criterion can hold is one the form can send', () => {
      const producible =
        field === 'class'
          ? // Every way a source writes a class, Class 1 to Class 20.
            Array.from({ length: 20 }, (_, i) => String(i + 1))
              .concat(['ix', 'x', 'xi', 'xii', 'IX', 'XII', '10th', 'ug'])
              .flatMap((raw) => criterionValues(field, raw))
          : FIXED_LISTS[field];
      const deliberate = Object.keys(CRITERION_ONLY_VALUES[field] ?? {});
      const unsendable = [...new Set(producible)].filter(
        (value) =>
          !(formValues(field) as unknown[]).includes(value) &&
          !deliberate.includes(String(value)),
      );
      expect(unsendable).toEqual([]);
      // A value listed as Criterion-only really is unsendable, so the list
      // can't go stale.
      for (const value of deliberate) {
        expect(formValues(field)).not.toContain(value);
        expect(producible).toContain(value);
      }
    });
  });

  describe.each(YES_NO_FIELDS)('%s', (field) => {
    it('reads yes and no as the true and false the form sends', () => {
      expect(readValue(field, ['yes'])).toBe(true);
      expect(readValue(field, ['no'])).toBe(false);
    });
  });

  describe.each(BOARD_MARKS_FIELDS)('%s', (field) => {
    const percent = (value: number) => ({ scale: 'percentage', value });

    it('holds a percentage from 0 to 100, as the form takes', () => {
      expect(readValue(field, ['85'])).toEqual(percent(85));
      expect(readValue(field, ['60%'])).toEqual(percent(60));
      expect(readValue(field, ['100'])).toEqual(percent(100));
      expect(readValue(field, ['101'])).toBeUndefined();
    });

    it('holds results on exactly the Result scales the form offers for it', () => {
      // One threshold on every scale, as a source or a reviewer writes it.
      const written = ['85', '8.5 CGPA', '3.5 GPA', '36 IB points', 'AAB'];
      const held = written
        .map((raw) => readValue(field, [raw]) as { scale: string } | undefined)
        .flatMap((value) => (value ? [value.scale] : []));
      const offered = rules.SLOT_SCALES[field as 'class10Result'];
      expect(held.sort()).toEqual([...offered].sort());
      const named = form.RESULT_SCALES.map((option) => option.value);
      for (const scale of offered) expect(named).toContain(scale);
    });
  });

  it('the form and the backend take the same Result scales, slots and grades', () => {
    expect(rules.SLOT_SCALES).toEqual(SLOT_SCALES);
    expect(form.A_LEVEL_GRADES).toEqual(A_LEVEL_GRADES);
    expect(rules.RESULT_SCALE_RANGES).toEqual(RESULT_SCALE_RANGES);
    expect(rules.NO_CLASS_10_EXAM_BOARDS).toEqual(NO_CLASS_10_EXAM_BOARDS);
    expect(rules.NO_CLASS_12_EXAM_BOARDS).toEqual(NO_CLASS_12_EXAM_BOARDS);
  });

  describe.each(TEST_SCORE_FIELDS)('%s', (field) => {
    it('the form and the backend take the same range', () => {
      expect(rules.TEST_SCORE_RANGES[field]).toEqual(TEST_SCORE_RANGES[field]);
    });

    it('holds a minimum inside the range the form takes, and nothing outside it', () => {
      const [, max] = TEST_SCORE_RANGES[field];
      expect(readValue(field, [String(max)])).toBe(max);
      expect(readValue(field, [String(max + 1)])).toBeUndefined();
    });
  });

  describe('incomeBand', () => {
    // The Criterion holds a rupee limit; the form sends a band. Every band
    // must be one the Matcher can place against a limit.
    const limit = (rupees: number) => ({
      id: 'limit',
      name: 'Income limit',
      provider: 'Example',
      amountText: 'Rs. 10,000',
      officialUrl: 'https://example.org',
      lastVerified: new Date('2026-07-20T09:00:00Z'),
      confidence: 'high' as const,
      criteria: [
        {
          field: 'incomeBand',
          op: 'lte' as const,
          value: rupees,
          changeable: false,
          sourceText: 'Family income must not exceed the limit.',
          confidence: 'high' as const,
        },
      ],
    });

    it.each(formValues('incomeBand'))(
      'decides a limit for the %s band',
      (band) => {
        // A band the Matcher doesn't know leaves every limit undecided
        // (Tell us more). A known one is decided by a limit of ₹1 crore
        // (passes all but the top band) or of ₹1 (fails all but the bottom).
        const profile = { incomeBand: band } as Profile;
        const undecided = [10_000_000, 1].filter(
          (rupees) =>
            match(profile, [limit(rupees)], '2026-07-20').tellUsMore.length,
        );
        expect(undecided.length).toBeLessThan(2);
      },
    );

    it('holds a limit in rupees', () => {
      expect(readValue('incomeBand', ['250000'])).toBe(250_000);
      expect(readValue('incomeBand', ['Rs. 2.5 lakh'])).toBe(250_000);
    });
  });

  describe('incomeAmount', () => {
    const formCodes = formCurrencies.CURRENCIES.map((option) => option.value);

    it('the form and the backend hold the same currencies, and the same currency for each country', () => {
      expect(formCurrencies.CURRENCIES).toEqual(CURRENCIES);
      expect(formCurrencies.COUNTRY_CURRENCIES).toEqual(COUNTRY_CURRENCIES);
    });

    it("every country's currency is one the form offers", () => {
      const unoffered = Object.values(COUNTRY_CURRENCIES).filter(
        (currency) => !formCodes.includes(currency),
      );
      expect(unoffered).toEqual([]);
    });

    it('every currency the form can send, but rupees, is one a Criterion can hold', () => {
      // A rupee limit is a rupee band limit (incomeBand), which a rupee
      // amount is judged against instead.
      const unread = formCodes.filter(
        (currency) =>
          currency !== 'INR' &&
          !isEqual(readValue('incomeAmount', [`${currency} 1000 yearly`]), {
            currency,
            period: 'yearly',
            value: 1000,
          }),
      );
      expect(unread).toEqual([]);
      expect(readValue('incomeAmount', ['INR 1000 yearly'])).toBeUndefined();
    });
  });

  describe('countries and regions', () => {
    it('the form and the backend hold the same countries and regions', () => {
      expect(formPlaces.COUNTRIES).toEqual(COUNTRIES);
      expect(formPlaces.REGIONS).toEqual(REGIONS);
    });

    it('the form and the backend place each Indian state in the same region of India', () => {
      expect(form.STATE_REGIONS).toEqual(STATE_REGIONS);
      const indianRegions = REGIONS.IN.map((region) => region.value);
      expect(Object.values(STATE_REGIONS).sort()).toEqual(
        [...indianRegions].sort(),
      );
    });

    it('the form and the backend read the same old destination names as the same codes', () => {
      expect(rules.LEGACY_DESTINATIONS).toEqual(LEGACY_DESTINATIONS);
    });

    it('reads a code as the LLM or a reviewer may write it', () => {
      expect(readValue('countryOfResidence', ['ae'])).toEqual(['AE']);
      expect(readValue('region', ['ca-on'])).toEqual(['CA-ON']);
      expect(readValue('citizenshipCountry', ['XX'])).toBeUndefined();
    });
  });
});
