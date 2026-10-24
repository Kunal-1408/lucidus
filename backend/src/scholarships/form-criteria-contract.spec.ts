// The contract between the Profile form and the Criteria: every value the
// form can send for a field is one that field's Criteria are written in, and
// every value a Criterion can hold is one the form can send. The frontend
// keeps its own copy of the fixed lists (there is no shared types package),
// so this test reads them straight from frontend/src/app/profile-fields.ts.
import * as formPlaces from '../../../frontend/src/app/countries.js';
import * as form from '../../../frontend/src/app/profile-fields.js';
import { readValue } from '../ingestion/extractor.js';
import { FIXED_LISTS } from '../ingestion/normalise.js';
import { COUNTRIES, REGIONS } from '../match/countries.js';
import { match } from '../match/matcher.js';
import { type Profile, STATE_REGIONS } from '../match/profile.js';
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
  destination: form.DESTINATIONS,
  incomeBand: form.INCOME_BANDS,
  gender: form.GENDERS,
  category: form.CATEGORIES,
  parentOccupation: form.PARENT_OCCUPATIONS,
  examsQualified: form.EXAMS,
};
// Fields the form asks as a yes / no question.
const YES_NO_FIELDS = ['minority', 'disability', 'singleGirlChild'];
// Fields the form asks as a percentage.
const MARKS_FIELDS = ['class10Marks', 'latestMarks'];

// Values deliberately on one side only, each with the reason.
const FORM_ONLY_FIELDS: Record<string, string> = {
  boardsUpcoming:
    'not a condition a Scholarship sets: it only lets a marks shortfall become a Goal',
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
    ...MARKS_FIELDS,
  ];

  it('the form asks about every field a Criterion can check', () => {
    const unasked = Object.keys(CRITERION_FIELDS).filter(
      (field) => !formFields.includes(field),
    );
    expect(unasked).toEqual([]);
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

  describe.each(MARKS_FIELDS)('%s', (field) => {
    it('holds a percentage from 0 to 100, as the form takes', () => {
      expect(readValue(field, ['85'])).toBe(85);
      expect(readValue(field, ['60%'])).toBe(60);
      expect(readValue(field, ['100'])).toBe(100);
      expect(readValue(field, ['101'])).toBeUndefined();
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

    it('reads a code as the LLM or a reviewer may write it', () => {
      expect(readValue('countryOfResidence', ['ae'])).toEqual(['AE']);
      expect(readValue('region', ['ca-on'])).toEqual(['CA-ON']);
      expect(readValue('citizenshipCountry', ['XX'])).toBeUndefined();
    });
  });
});
