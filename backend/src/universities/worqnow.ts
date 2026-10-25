import { Inject, Injectable } from '@nestjs/common';
import { HTTP_FETCH, type HttpFetch } from '../ingestion/fetcher.js';

// The WorqNow client is injected so tests can serve canned university lists.
export const WORQNOW = Symbol('WORQNOW');

// The destinations WorqNow covers. The pointers are stored and returned
// under these names, which the Profile used before destinations became ISO
// codes.
export const POINTER_COUNTRIES = ['uk', 'usa', 'canada', 'australia'] as const;
export type PointerCountry = (typeof POINTER_COUNTRIES)[number];

// The ISO 3166-1 alpha-2 destination each pointer country is.
export const POINTER_COUNTRY_CODES: Record<PointerCountry, string> = {
  uk: 'GB',
  usa: 'US',
  canada: 'CA',
  australia: 'AU',
};

export interface WorqNowUniversity {
  code: string;
  name?: string;
}

export interface WorqNowClient {
  // Universities in a country that offer international scholarships.
  // Rejects when the fetch fails, so the caller can keep the previous list.
  universitiesWithScholarships(
    country: PointerCountry,
  ): Promise<WorqNowUniversity[]>;
}

const BASE_URL = 'https://api.worqnow.ai/education';
const TIMEOUT_MS = 20_000;
// WorqNow's own country codes in its per-country endpoints.
const WORQNOW_CODES: Record<PointerCountry, string> = {
  uk: 'uk',
  usa: 'usa',
  canada: 'ca',
  australia: 'au',
};
// The largest page WorqNow serves; every country has fewer universities.
const PAGE_LIMIT = 100;

// Calls WorqNow's per-country university endpoint, e.g.
// GET /education/uk/universities?has_scholarship=true&limit=100, which
// answers { count, data: [{ code, name, ... }] }.
@Injectable()
export class HttpWorqNowClient implements WorqNowClient {
  constructor(@Inject(HTTP_FETCH) private readonly httpFetch: HttpFetch) {}

  async universitiesWithScholarships(
    country: PointerCountry,
  ): Promise<WorqNowUniversity[]> {
    const url = `${BASE_URL}/${WORQNOW_CODES[country]}/universities?has_scholarship=true&limit=${PAGE_LIMIT}`;
    const key = process.env.WORQNOW_API_KEY;
    const response = await this.httpFetch(url, {
      headers: key ? { 'x-api-key': key } : {},
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`WorqNow answered ${response.status}`);
    const body = (await response.json()) as { data?: unknown };
    if (!Array.isArray(body.data)) {
      throw new Error('WorqNow answered without a data list');
    }
    return body.data
      .filter(
        (u): u is { code: string; name?: unknown } =>
          typeof u === 'object' && u !== null && typeof u.code === 'string',
      )
      .map((u) => ({
        code: u.code,
        ...(typeof u.name === 'string' && u.name.trim()
          ? { name: u.name.trim() }
          : {}),
      }));
  }
}
