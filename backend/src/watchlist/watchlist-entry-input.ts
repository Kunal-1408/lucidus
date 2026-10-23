import type {
  SourceType,
  SplitRule,
  WatchlistEntry,
} from './watchlist-entry.schema.js';

// A Watchlist entry as the operator may send it: everything but the last
// result, which only Ingestion writes.
export type WatchlistEntryInput = Omit<WatchlistEntry, 'lastResult'>;

export type ParseResult =
  { ok: true; entry: WatchlistEntryInput } | { ok: false; reasons: string[] };

const SOURCE_TYPES = ['html', 'pdf', 'json'] as const;
const REGIONS = ['india', 'abroad'] as const;
const SCHOLARSHIP_TYPES = ['government', 'corporate', 'university'] as const;
const HOLDS = ['one', 'many'] as const;

// The fields of a split rule each source type needs, per the Splitter's
// fixed rules: JSON items path and name field, HTML heading selector, PDF
// line pattern.
const SPLIT_FIELDS: Record<SourceType, (keyof SplitRule)[]> = {
  json: ['itemsPath', 'nameField'],
  html: ['splitSelector'],
  pdf: ['splitPattern'],
};

// Checks an entry sent to the admin endpoint, collecting every reason it is
// rejected so the operator can fix them all at once. Unknown fields are
// dropped.
export function parseWatchlistEntry(body: unknown): ParseResult {
  const raw = isObject(body) ? body : {};
  const reasons: string[] = [];

  const url = httpUrl(raw, 'url', reasons);
  const type = oneOf(raw, 'type', SOURCE_TYPES, reasons);
  const region = oneOf(raw, 'region', REGIONS, reasons);
  const name = text(raw, 'name', reasons);
  const provider = text(raw, 'provider', reasons);
  const scholarshipType = oneOf(
    raw,
    'scholarshipType',
    SCHOLARSHIP_TYPES,
    reasons,
  );
  const officialUrl = httpUrl(raw, 'officialUrl', reasons);
  const holds =
    raw.holds === undefined ? 'one' : oneOf(raw, 'holds', HOLDS, reasons);
  const split = splitRule(raw.split, holds, type, reasons);

  if (reasons.length > 0) return { ok: false, reasons };
  return {
    ok: true,
    entry: {
      url: url!,
      type: type!,
      region: region!,
      name: name!,
      provider: provider!,
      scholarshipType: scholarshipType!,
      officialUrl: officialUrl!,
      holds: holds!,
      ...(split && { split }),
    },
  };
}

function splitRule(
  value: unknown,
  holds: 'one' | 'many' | undefined,
  type: SourceType | undefined,
  reasons: string[],
): SplitRule | undefined {
  if (holds !== 'many') {
    if (value !== undefined && holds === 'one') {
      reasons.push('split is only allowed when holds is many');
    }
    return undefined;
  }
  if (value === undefined) {
    reasons.push('split is required when holds is many');
    return undefined;
  }
  if (!isObject(value)) {
    reasons.push('split must be an object');
    return undefined;
  }
  if (!type) return undefined;
  const rule: SplitRule = {};
  for (const field of SPLIT_FIELDS[type]) {
    const given = value[field];
    if (typeof given !== 'string' || given.trim() === '') {
      reasons.push(`split.${field} is required for ${article(type)} source`);
      continue;
    }
    rule[field] = given;
  }
  // The Splitter starts a section at each heading, so the selector names one.
  if (
    rule.splitSelector !== undefined &&
    !/^h[1-6]$/i.test(rule.splitSelector.trim())
  ) {
    reasons.push('split.splitSelector must be a heading tag (h1 to h6)');
  }
  if (rule.splitPattern !== undefined && !isRegex(rule.splitPattern)) {
    reasons.push('split.splitPattern must be a valid regular expression');
  }
  return rule;
}

function text(
  raw: Record<string, unknown>,
  field: string,
  reasons: string[],
): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null || value === '') {
    reasons.push(`${field} is required`);
    return undefined;
  }
  if (typeof value !== 'string') {
    reasons.push(`${field} must be a string`);
    return undefined;
  }
  if (value.trim() === '') {
    reasons.push(`${field} is required`);
    return undefined;
  }
  return value.trim();
}

function httpUrl(
  raw: Record<string, unknown>,
  field: string,
  reasons: string[],
): string | undefined {
  const value = text(raw, field, reasons);
  if (value === undefined) return undefined;
  if (!URL.canParse(value) || !/^https?:$/.test(new URL(value).protocol)) {
    reasons.push(`${field} must be an http or https URL`);
    return undefined;
  }
  return value;
}

function oneOf<T extends string>(
  raw: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  reasons: string[],
): T | undefined {
  const value = raw[field];
  if (
    typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
  ) {
    return value as T;
  }
  reasons.push(
    value === undefined
      ? `${field} is required`
      : `${field} must be one of ${allowed.join(', ')}`,
  );
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

function article(type: SourceType): string {
  return type === 'html' ? 'an html' : `a ${type}`;
}
