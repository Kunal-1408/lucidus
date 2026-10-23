import type { Criterion } from './scholarship.schema.js';
import { scholarshipConfidence } from './confidence.js';

// Seam 3's Confidence assignment, for the Scholarship as a whole.
const criterion = (
  field: string,
  confidence: Criterion['confidence'],
): Criterion => ({
  field,
  op: 'eq',
  value: 'yes',
  changeable: false,
  sourceText: 'Open to all.',
  confidence,
});
const GIRLS = criterion('gender', 'high');
const OFFICIAL = 'https://example.org/';

describe('Scholarship Confidence', () => {
  it("is its weakest Criterion's", () => {
    expect(
      scholarshipConfidence([GIRLS, criterion('class', 'medium')], OFFICIAL),
    ).toBe('medium');
  });

  it.each([undefined, ''])(
    'is low when the official URL is missing (%j)',
    (officialUrl) => {
      expect(scholarshipConfidence([GIRLS], officialUrl)).toBe('low');
    },
  );
});
