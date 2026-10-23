import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AnthropicLlmClient } from './anthropic-llm.js';
import { extract } from './extractor.js';
import { cleanHtml } from './fetcher.js';

// The one test against the real Claude Haiku, skipped unless asked for:
//   REAL_LLM=1 npx vitest run anthropic-llm
// It needs ANTHROPIC_API_KEY (or an `ant auth login` profile) and costs a
// fraction of a cent.
const FIXTURES = join(import.meta.dirname, '../../test/fixtures');

describe.runIf(process.env.REAL_LLM === '1')(
  'Extractor against the real Claude Haiku',
  () => {
    it('reads the NMMSS page with every value quoted from the page', async () => {
      const text = cleanHtml(
        readFileSync(join(FIXTURES, 'extractor/myscheme-nmmss.html'), 'utf8'),
      );
      const extraction = await extract(text, new AnthropicLlmClient());

      // The rules' values stay; whatever the model added passed the quote
      // check, so nothing is low.
      expect(extraction.criteria).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'incomeBand',
            value: 350_000,
            confidence: 'high',
          }),
        ]),
      );
      expect(extraction.criteria.filter((c) => c.confidence === 'low')).toEqual(
        [],
      );
      expect(extraction.amountText).toBe('₹12,000/- per annum');
    }, 120_000);
  },
);
