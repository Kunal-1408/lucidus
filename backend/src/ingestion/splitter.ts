import type { WatchlistEntry } from '../watchlist/watchlist-entry.schema.js';
import { BLOCK_ELEMENTS, loadWithoutChrome, tidyLines } from './fetcher.js';

// One Scholarship's share of a source: its scheme name and its own cleaned
// text, which is hashed and extracted on its own.
export interface Section {
  schemeName: string;
  text: string;
  // The section's own official link, when it has one; otherwise the
  // entry's official URL applies.
  officialUrl?: string;
}

// A fetched source as the Splitter sees it.
export interface FetchedSource {
  // The body as served.
  raw: string;
  // The whole source cleaned.
  text: string;
}

// Turns one source into its Scholarship sections with the entry's fixed
// rule. A one-scholarship entry passes through as a single section named
// after the entry. An empty list means the rule found nothing.
export function split(entry: WatchlistEntry, source: FetchedSource): Section[] {
  if (entry.holds === 'one') {
    return [{ schemeName: entry.name, text: source.text }];
  }
  const rule = SPLIT_RULES[entry.type];
  if (!rule) {
    throw new Error(`Splitting ${entry.type} sources is not supported yet`);
  }
  return rule(entry, source);
}

type SplitRule = (entry: WatchlistEntry, source: FetchedSource) => Section[];

// One rule per source type; a new type adds its rule here.
const SPLIT_RULES: Partial<Record<WatchlistEntry['type'], SplitRule>> = {
  html: splitHtml,
};

// Mark where each heading, and each official link, stood in the page text.
const HEADING_MARK = '\u0001';
const LINK_MARK = '\u0002';
// A link counts as a section's official link when its text says so.
const OFFICIAL_LINK_TEXT = /\bofficial\b/i;

// Each heading matching the entry's split selector starts a section that
// runs to the next one; the heading text is the scheme name. Text before the
// first heading belongs to no Scholarship. A section linking to an
// "official" site carries the first such link as its official URL.
function splitHtml(entry: WatchlistEntry, source: FetchedSource): Section[] {
  const selector = entry.split?.splitSelector;
  if (!selector) throw new Error('A many HTML entry needs a split selector');
  const $ = loadWithoutChrome(source.raw);

  const links: string[] = [];
  $('a[href]').each((_, a) => {
    const href = absoluteHttpUrl($(a).attr('href'), entry.url);
    if (!href || !OFFICIAL_LINK_TEXT.test($(a).text())) return;
    $(a).after(`${LINK_MARK}${links.length}${LINK_MARK}`);
    links.push(href);
  });

  const names: string[] = [];
  $(selector).each((_, heading) => {
    const name = tidyLines($(heading).text()).replace(/\n/g, ' ');
    $(heading).replaceWith(
      `\n${HEADING_MARK}${names.length}${HEADING_MARK}\n${name}\n`,
    );
    names.push(name);
  });
  $(BLOCK_ELEMENTS).after('\n');

  const sections: Section[] = [];
  // Marks split text into pieces alternating text, index, text, index, ...
  const chunks = $('body').text().split(HEADING_MARK).slice(1);
  for (let i = 0; i + 1 < chunks.length; i += 2) {
    const schemeName = names[Number(chunks[i])];
    // A repeated heading would collide on the Scholarship key; the first wins.
    if (!schemeName || sections.some((s) => s.schemeName === schemeName)) {
      continue;
    }
    const pieces = chunks[i + 1].split(LINK_MARK);
    const text = tidyLines(pieces.filter((_, j) => j % 2 === 0).join(''));
    const linkIndex = pieces[1];
    sections.push(
      linkIndex === undefined
        ? { schemeName, text }
        : { schemeName, text, officialUrl: links[Number(linkIndex)] },
    );
  }
  return sections;
}

function absoluteHttpUrl(
  href: string | undefined,
  base: string,
): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href, base);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
