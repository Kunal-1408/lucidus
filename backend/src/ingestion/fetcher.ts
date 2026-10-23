import { Inject, Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SourceType } from '../watchlist/watchlist-entry.schema.js';

// The raw HTTP call is injected so tests can serve committed fixtures.
export const HTTP_FETCH = Symbol('HTTP_FETCH');
export type HttpFetch = typeof globalThis.fetch;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const TIMEOUT_MS = 20_000;

export type FetchResult =
  | { ok: true; text: string }
  | { ok: false; failure: 'not_found' | 'server_error' | 'network_error' };

// Fetches a Watchlist source and returns its cleaned text, or a typed failure.
@Injectable()
export class Fetcher {
  constructor(@Inject(HTTP_FETCH) private readonly httpFetch: HttpFetch) {}

  async fetch(url: string, type: SourceType): Promise<FetchResult> {
    let response: Response;
    try {
      response = await this.httpFetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return { ok: false, failure: 'network_error' };
    }
    if (response.status === 404 || response.status === 410) {
      return { ok: false, failure: 'not_found' };
    }
    if (!response.ok) return { ok: false, failure: 'server_error' };

    if (type !== 'html') {
      throw new Error(`Source type ${type} is not supported yet`);
    }
    return { ok: true, text: cleanHtml(await response.text()) };
  }
}

const BLOCK_ELEMENTS =
  'p, div, li, br, tr, td, th, h1, h2, h3, h4, h5, h6, section, article';

// Drops page chrome and keeps the visible text, one block per line, so
// sentences from separate elements don't run together.
export function cleanHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, header, footer').remove();
  $(BLOCK_ELEMENTS).after('\n');
  return $('body')
    .text()
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
