import type { Criterion } from '../scholarships/scholarship.schema.js';
import type { WatchlistEntry } from '../watchlist/watchlist-entry.schema.js';
import { BLOCK_ELEMENTS, loadWithoutChrome, tidyLines } from './fetcher.js';
import { isObject } from '../input-checks.js';
import {
  itemsAt,
  jsonText,
  parseJson,
  structuredCriteria,
} from './json-source.js';

// One Scholarship's share of a source: its scheme name and its own cleaned
// text, which is hashed and extracted on its own.
export interface Section {
  schemeName: string;
  text: string;
  // The section's own official link, when it has one; otherwise the
  // entry's official URL applies.
  officialUrl?: string;
  // Criteria a JSON item states as fields of its own (high Confidence);
  // they win over extracted Criteria on the same field.
  criteria?: Criterion[];
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
// after the entry (a JSON document's top-level fields can be Criteria, as an
// item's are). An empty list means the rule found nothing.
export function split(entry: WatchlistEntry, source: FetchedSource): Section[] {
  if (entry.holds === 'one') {
    const one = { schemeName: entry.name, text: source.text };
    return entry.type === 'json'
      ? [{ ...one, criteria: structuredCriteria(parseJson(source.raw)) }]
      : [one];
  }
  return SPLIT_RULES[entry.type](entry, source);
}

type SplitRule = (entry: WatchlistEntry, source: FetchedSource) => Section[];

// One rule per source type; a new type adds its rule here.
const SPLIT_RULES: Record<WatchlistEntry['type'], SplitRule> = {
  html: splitHtml,
  pdf: splitPdf,
  json: splitJson,
};

// Each item in the array at the entry's items path is one Scholarship, named
// by its name field; an item with no name there belongs to no Scholarship.
// The item's text and its structured Criteria come from that item alone.
function splitJson(entry: WatchlistEntry, source: FetchedSource): Section[] {
  const { itemsPath, nameField } = entry.split ?? {};
  if (!itemsPath || !nameField) {
    throw new Error('A many JSON entry needs an items path and a name field');
  }
  const sections: Section[] = [];
  for (const item of itemsAt(parseJson(source.raw), itemsPath) ?? []) {
    const name = isObject(item) ? item[nameField] : undefined;
    const schemeName = typeof name === 'string' ? name.trim() : '';
    if (!schemeName) continue;
    addSection(sections, {
      schemeName,
      text: jsonText(item),
      criteria: structuredCriteria(item),
    });
  }
  return sections;
}

// Each line matching the entry's split pattern starts a section that runs to
// the next matching line. The pattern's first captured group is the scheme
// name, or the whole line when it captures nothing; the line itself is part
// of the section's text. Lines before the first match belong to no
// Scholarship.
function splitPdf(entry: WatchlistEntry, source: FetchedSource): Section[] {
  const pattern = entry.split?.splitPattern;
  if (!pattern) throw new Error('A many PDF entry needs a split pattern');
  const startsSection = new RegExp(pattern);

  const sections: Section[] = [];
  let current: { schemeName: string; lines: string[] } | undefined;
  const close = () => {
    if (current) {
      addSection(sections, {
        schemeName: current.schemeName,
        text: current.lines.join('\n'),
      });
    }
  };
  for (const line of source.text.split('\n')) {
    const start = line.match(startsSection);
    const schemeName = start && (start[1] ?? start[0]).trim();
    if (schemeName) {
      close();
      current = { schemeName, lines: [] };
    }
    current?.lines.push(line);
  }
  close();
  return sections;
}

// A repeated scheme name would collide on the Scholarship key; the first wins.
function addSection(sections: Section[], section: Section): void {
  if (sections.some((s) => s.schemeName === section.schemeName)) return;
  sections.push(section);
}

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
    if (!schemeName) continue;
    const pieces = chunks[i + 1].split(LINK_MARK);
    const text = tidyLines(pieces.filter((_, j) => j % 2 === 0).join(''));
    const linkIndex = pieces[1];
    addSection(
      sections,
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
