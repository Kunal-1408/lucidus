// Checks shared by the parsers of outside input (admin endpoints, repo
// seed files, JSON sources); the field checks push the reason a field is
// rejected onto the list they are given.

export function text(
  raw: Record<string, unknown>,
  field: string,
  reasons: string[],
  // How the reason names the field, e.g. "criteria[0].sourceText".
  label = field,
): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null || value === '') {
    reasons.push(`${label} is required`);
    return undefined;
  }
  if (typeof value !== 'string') {
    reasons.push(`${label} must be a string`);
    return undefined;
  }
  if (value.trim() === '') {
    reasons.push(`${label} is required`);
    return undefined;
  }
  return value.trim();
}

export function oneOf<T extends string>(
  raw: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  reasons: string[],
  label = field,
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
      ? `${label} is required`
      : `${label} must be one of ${allowed.join(', ')}`,
  );
  return undefined;
}

export function numberBetween(
  raw: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
  reasons: string[],
  label = field,
): number | undefined {
  const value = raw[field];
  if (typeof value === 'number' && value >= min && value <= max) return value;
  reasons.push(
    value === undefined
      ? `${label} is required`
      : `${label} must be from ${min} to ${max}`,
  );
  return undefined;
}

export function yesNo(
  raw: Record<string, unknown>,
  field: string,
  reasons: string[],
  label = field,
): boolean | undefined {
  const value = raw[field];
  if (typeof value === 'boolean') return value;
  reasons.push(
    value === undefined
      ? `${label} is required`
      : `${label} must be true or false`,
  );
  return undefined;
}

// A list whose every item is one of the allowed values; repeats are dropped.
export function listOf<T extends string>(
  raw: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  reasons: string[],
  label = field,
): T[] | undefined {
  const value = raw[field];
  const isAllowed = (item: unknown): item is T =>
    typeof item === 'string' && (allowed as readonly string[]).includes(item);
  if (Array.isArray(value) && value.every(isAllowed)) {
    return [...new Set(value)];
  }
  reasons.push(
    value === undefined
      ? `${label} is required`
      : `${label} must be a list of ${allowed.join(', ')}`,
  );
  return undefined;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
