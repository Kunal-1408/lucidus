import { Inject, Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PDFParse } from 'pdf-parse';
import { SourceType } from '../watchlist/watchlist-entry.schema.js';
import { jsonText, parseJson } from './json-source.js';

// The raw HTTP call is injected so tests can serve committed fixtures.
export const HTTP_FETCH = Symbol('HTTP_FETCH');
export type HttpFetch = typeof globalThis.fetch;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const TIMEOUT_MS = 20_000;
// Cleaned text shorter than this is a page built by JavaScript: there is
// nothing to extract until someone finds its JSON endpoint.
export const NEEDS_JS_BELOW_CHARS = 300;

export type FetchResult =
  // `raw` is the body as served, for the Splitter; `text` is the whole
  // source cleaned.
  | { ok: true; text: string; raw: string; needsJs: boolean }
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

    return { ok: true, ...(await READERS[type](response)) };
  }
}

type Read = { text: string; raw: string; needsJs: boolean };

// How each source type's body becomes cleaned text. Only an HTML page can be
// built by JavaScript; a short PDF or JSON body is simply short.
const READERS: Record<SourceType, (response: Response) => Promise<Read>> = {
  html: async (response) => {
    const raw = await response.text();
    const text = cleanHtml(raw);
    return { text, raw, needsJs: text.length < NEEDS_JS_BELOW_CHARS };
  },
  // The Splitter reads a PDF's lines, so its raw form is its text too.
  pdf: async (response) => {
    const text = await pdfText(await response.arrayBuffer());
    return { text, raw: text, needsJs: false };
  },
  json: async (response) => {
    const raw = await response.text();
    return { text: jsonText(parseJson(raw)), raw, needsJs: false };
  },
};

async function pdfText(body: ArrayBuffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(body) });
  try {
    // No page markers: they would land in the text and its hash.
    const { text } = await parser.getText({ pageJoiner: '' });
    return tidyLines(text);
  } finally {
    await parser.destroy();
  }
}

export const BLOCK_ELEMENTS =
  'p, div, li, br, tr, td, th, h1, h2, h3, h4, h5, h6, section, article';

// Drops page chrome and keeps the visible text, one block per line, so
// sentences from separate elements don't run together.
export function cleanHtml(html: string): string {
  const $ = loadWithoutChrome(html);
  $(BLOCK_ELEMENTS).after('\n');
  return tidyLines($('body').text());
}

export function loadWithoutChrome(html: string): cheerio.CheerioAPI {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, header, footer').remove();
  return $;
}

// Collapses whitespace within lines and drops blank ones.
export function tidyLines(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
