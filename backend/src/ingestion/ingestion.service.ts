import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CLOCK, type Clock } from '../clock.js';
import {
  ConfidenceLevel,
  Criterion,
  Scholarship,
} from '../scholarships/scholarship.schema.js';
import {
  LastResult,
  WatchlistEntry,
} from '../watchlist/watchlist-entry.schema.js';
import { extract } from './extractor.js';
import { Fetcher } from './fetcher.js';

export interface SourceOutcome {
  url: string;
  result: LastResult;
}

export interface RunSummary {
  sources: SourceOutcome[];
}

// One Ingestion run: fetch each Watchlist source, extract its Criteria and
// upsert its Scholarship.
@Injectable()
export class IngestionService {
  constructor(
    @InjectModel(WatchlistEntry.name)
    private readonly watchlist: Model<WatchlistEntry>,
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
    private readonly fetcher: Fetcher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async run(): Promise<RunSummary> {
    const sources: SourceOutcome[] = [];
    for (const entry of await this.watchlist.find().lean()) {
      const result = await this.ingest(entry);
      await this.watchlist.updateOne(
        { _id: entry._id },
        { lastResult: result },
      );
      sources.push({ url: entry.url, result });
    }
    return { sources };
  }

  private async ingest(entry: WatchlistEntry): Promise<LastResult> {
    const fetched = await this.fetcher.fetch(entry.url, entry.type);
    if (!fetched.ok) {
      return fetched.failure === 'not_found' ? 'not_found' : 'failed';
    }

    const { criteria, amountText } = extract(fetched.text);
    const confidence = weakest(criteria);
    const scholarship: Scholarship = {
      name: entry.name,
      provider: entry.provider,
      type: entry.scholarshipType,
      amountText,
      officialUrl: entry.officialUrl,
      sourceUrl: entry.url,
      schemeName: entry.name,
      contentHash: createHash('sha256').update(fetched.text).digest('hex'),
      lastVerified: this.clock.now(),
      status: 'active',
      confidence,
      // Zero Criteria would show as Eligible to everyone.
      needsReview: confidence === 'low' || criteria.length === 0,
      criteria,
      extraRequirements: [],
    };
    await this.scholarships.updateOne(
      { sourceUrl: scholarship.sourceUrl, schemeName: scholarship.schemeName },
      scholarship,
      { upsert: true },
    );
    return 'ok';
  }
}

const RANK: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };

function weakest(criteria: Criterion[]): ConfidenceLevel {
  return criteria.reduce<ConfidenceLevel>(
    (lowest, c) => (RANK[c.confidence] < RANK[lowest] ? c.confidence : lowest),
    'high',
  );
}
