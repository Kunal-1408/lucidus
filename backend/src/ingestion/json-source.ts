// JSON sources: how a parsed JSON value becomes cleaned text for the
// Extractor, and which of its fields are Criteria in their own right.
import { isObject } from '../input-checks.js';
import {
  CRITERION_FIELDS,
  EXTRACTED_FIELDS,
} from '../scholarships/criterion-fields.js';
import type { Criterion } from '../scholarships/scholarship.schema.js';
import { normaliseValue } from './normalise.js';

// A JSON body, parsed; a body that isn't JSON fails its source.
export function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('The source is not valid JSON');
  }
}

// One line per value, "key: value", nested keys joined with dots, so the
// Extractor reads every field and its sentence names the field it came from.
// Empty values leave no line.
export function jsonText(value: unknown): string {
  return lines('', value).join('\n');
}

function lines(path: string, value: unknown): string[] {
  if (
    isPrimitive(value) ||
    (Array.isArray(value) && value.every(isPrimitive))
  ) {
    const text = line(path, value);
    return text === line(path, '') ? [] : [text];
  }
  if (Array.isArray(value)) return value.flatMap((v) => lines(path, v));
  if (isObject(value)) {
    return Object.entries(value).flatMap(([key, v]) =>
      lines(path ? `${path}.${key}` : key, v),
    );
  }
  return [];
}

function line(path: string, value: Primitive | Primitive[]): string {
  const text = (Array.isArray(value) ? value.join(', ') : String(value))
    .replace(/\s+/g, ' ')
    .trim();
  return path ? `${path}: ${text}` : text;
}

// The array at a dotted items path ("data.schemes"; "$" is the document
// itself), or undefined when there is none.
export function itemsAt(
  doc: unknown,
  itemsPath: string,
): unknown[] | undefined {
  let value = doc;
  for (const key of itemsPath.split('.')) {
    if (key === '$' || key === '') continue;
    value = isObject(value) ? value[key] : undefined;
  }
  return Array.isArray(value) ? value : undefined;
}

// Fields whose values are parsed from figures and labels, not slugs.
const PARSED_FIELDS = ['class', 'class10Result', 'class12Result', 'incomeBand'];

// The Criteria an item states as top-level fields named after Profile
// fields (CRITERION_FIELDS). A value that fits the field's fixed list is high Confidence, like
// a regex match; one that doesn't is dropped. Each Criterion's sentence is
// the field's line in the item's text.
export function structuredCriteria(item: unknown): Criterion[] {
  if (!isObject(item)) return [];
  const criteria: Criterion[] = [];
  for (const field of EXTRACTED_FIELDS) {
    const { op, changeable } = CRITERION_FIELDS[field];
    const given = item[field];
    if (
      !isPrimitive(given) &&
      !(Array.isArray(given) && given.every(isPrimitive))
    )
      continue;
    const value = normaliseValue(field, op, toRaw(field, given));
    if (value === undefined) continue;
    criteria.push({
      field,
      op,
      value,
      changeable,
      sourceText: line(field, given),
      confidence: 'high',
    });
  }
  return criteria;
}

// A JSON value in the form normalisation reads: "Female" → "female",
// "Tamil Nadu" → "tamil_nadu", true → "yes", 250000 → "250000".
function toRaw(
  field: string,
  value: Primitive | Primitive[],
): string | string[] {
  if (Array.isArray(value)) return value.map((v) => toRaw(field, v) as string);
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  const lower = value.trim().toLowerCase();
  return PARSED_FIELDS.includes(field) ? lower : lower.replace(/[\s-]+/g, '_');
}

// A section's structured Criteria together with the extracted ones; where
// both state a field, the structured Criterion is kept.
export function withStructured(
  structured: Criterion[] | undefined,
  extracted: Criterion[],
): Criterion[] {
  if (!structured?.length) return extracted;
  const fields = new Set(structured.map((c) => c.field));
  return [...structured, ...extracted.filter((c) => !fields.has(c.field))];
}

type Primitive = string | number | boolean;

function isPrimitive(value: unknown): value is Primitive {
  return ['string', 'number', 'boolean'].includes(typeof value);
}
