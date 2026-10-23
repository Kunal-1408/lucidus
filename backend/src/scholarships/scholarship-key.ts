// What identifies a Scholarship across runs: the Watchlist source it came
// from and its scheme name within that source.
export interface ScholarshipKey {
  sourceUrl: string;
  schemeName: string;
}

// The key of a Scholarship (or anything carrying one), without its other
// fields, for use as a query filter.
export function scholarshipKey({
  sourceUrl,
  schemeName,
}: ScholarshipKey): ScholarshipKey {
  return { sourceUrl, schemeName };
}
