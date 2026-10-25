import { createHash } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, type QueryFilter, Types } from 'mongoose';
import { CLOCK, type Clock } from '../clock.js';
import { checkOverride } from '../overrides/override-check.js';
import { Override } from '../overrides/override.schema.js';
import { scholarshipConfidence } from '../scholarships/confidence.js';
import {
  type Criterion,
  Scholarship,
} from '../scholarships/scholarship.schema.js';
import type { ScholarshipKey } from '../scholarships/scholarship-key.js';
import { UniversityPointersService } from '../universities/university-pointers.service.js';
import { WatchlistEntry } from '../watchlist/watchlist-entry.schema.js';
import { EXTRACTOR, type Extraction, type Extractor } from './extractor.js';
import { Fetcher } from './fetcher.js';
import { withStructured } from './json-source.js';
import { IngestionRun } from './ingestion-run.schema.js';
import { Section, split } from './splitter.js';
import {
  RunCounts,
  RunSummary,
  SourceOutcome,
  zeroCounts,
} from './run-summary.js';

// Raised when a release changes what extraction reads off unchanged text, so
// the next run re-extracts every Scholarship stored under an older version
// rather than keeping its stored extraction. 2: the old fields (latest
// marks, Class 10 marks, domicile and school state) removed, with Result
// scales, income abroad, Field of study groups, destinations and Test
// scores read.
export const EXTRACTION_VERSION = 2;

export type StartResult =
  { started: true; runId: string } | { started: false; runId: string };

// Orchestrates Ingestion runs: one at a time, in the background, each
// fetching every Watchlist source, splitting it into one section per
// Scholarship, extracting each and upserting it as soon as it is done, while recording a summary as it goes.
@Injectable()
export class IngestionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IngestionService.name);
  // The run in progress in this process, if any.
  private currentRunId?: string;

  constructor(
    @InjectModel(WatchlistEntry.name)
    private readonly watchlist: Model<WatchlistEntry>,
    @InjectModel(Scholarship.name)
    private readonly scholarships: Model<Scholarship>,
    @InjectModel(IngestionRun.name)
    private readonly runs: Model<IngestionRun>,
    @InjectModel(Override.name)
    private readonly overrides: Model<Override>,
    private readonly fetcher: Fetcher,
    @Inject(EXTRACTOR) private readonly extractor: Extractor,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly universityPointers: UniversityPointersService,
  ) {}

  // A run still marked running at startup was cut off when the host stopped.
  // Its Scholarships were saved one by one, so the next trigger resumes it:
  // finished ones come back unchanged and the rest are extracted.
  async onApplicationBootstrap() {
    await this.runs.updateMany(
      { state: 'running' },
      { state: 'interrupted', finishedAt: this.clock.now() },
    );
  }

  // Starts a run in the background, or reports the one already running.
  async start(): Promise<StartResult> {
    if (this.currentRunId) return { started: false, runId: this.currentRunId };
    // Claimed before the first await, so two triggers can't both start.
    const id = new Types.ObjectId();
    this.currentRunId = id.toHexString();
    try {
      await this.runs.create({
        _id: id,
        state: 'running',
        startedAt: this.clock.now(),
        counts: zeroCounts(),
        sources: [],
      });
    } catch (err) {
      this.currentRunId = undefined;
      throw err;
    }
    void this.execute(id).finally(() => {
      this.currentRunId = undefined;
    });
    return { started: true, runId: id.toHexString() };
  }

  async summary(runId: string): Promise<RunSummary | undefined> {
    if (!isValidObjectId(runId)) return undefined;
    const run = await this.runs.findById(runId).lean();
    if (!run) return undefined;
    return {
      runId,
      state: run.state,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      counts: run.counts,
      sources: run.sources,
      universityPointers: run.universityPointers ?? [],
    };
  }

  private async execute(id: Types.ObjectId): Promise<void> {
    const counts = zeroCounts();
    const sources: SourceOutcome[] = [];
    try {
      const entries = await this.watchlist.find().lean();
      await this.retireRemovedSources(entries, counts);
      await this.runs.updateOne({ _id: id }, { counts });
      for (const entry of entries) {
        const outcome = await this.ingestSource(entry, counts);
        sources.push(outcome);
        await this.watchlist.updateOne(
          { _id: entry._id },
          { lastResult: outcome.result },
        );
        await this.runs.updateOne({ _id: id }, { counts, sources });
      }
      await this.refreshUniversityPointers(id, counts);
      await this.finish(id, 'finished');
    } catch (err) {
      this.logger.error(`Ingestion run ${id.toHexString()} failed`, err);
      await this.finish(id, 'failed').catch(() => undefined);
    }
  }

  // Scholarships whose source was deleted from the Watchlist drop out of
  // results; like every Scholarship, they are never deleted.
  private async retireRemovedSources(
    entries: WatchlistEntry[],
    counts: RunCounts,
  ): Promise<void> {
    await this.markInactive(
      { sourceUrl: { $nin: entries.map((e) => e.url) } },
      counts,
    );
  }

  // Takes the matching active Scholarships out of results, counting them.
  private async markInactive(
    filter: QueryFilter<Scholarship>,
    counts: RunCounts,
  ): Promise<void> {
    const marked = await this.scholarships.updateMany(
      { ...filter, status: 'active' },
      { status: 'inactive' },
    );
    counts.inactive += marked.modifiedCount;
  }

  // University pointers come from WorqNow, not the Watchlist, so their
  // outcomes are reported apart from the sources.
  private async refreshUniversityPointers(
    id: Types.ObjectId,
    counts: RunCounts,
  ) {
    const universityPointers = await this.universityPointers.refresh();
    counts.worqnow_failed = universityPointers.filter(
      (o) => o.result === 'failed',
    ).length;
    await this.runs.updateOne({ _id: id }, { counts, universityPointers });
  }

  private finish(id: Types.ObjectId, state: 'finished' | 'failed') {
    return this.runs.updateOne(
      { _id: id },
      { state, finishedAt: this.clock.now() },
    );
  }

  // Any error inside one source fails that source only, never the run.
  private async ingestSource(
    entry: WatchlistEntry,
    counts: RunCounts,
  ): Promise<SourceOutcome> {
    try {
      return await this.processSource(entry, counts);
    } catch (err) {
      counts.failed++;
      return {
        url: entry.url,
        result: 'failed',
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async processSource(
    entry: WatchlistEntry,
    counts: RunCounts,
  ): Promise<SourceOutcome> {
    const url = entry.url;
    const fetched = await this.fetcher.fetch(url, entry.type);
    if (!fetched.ok) {
      if (fetched.failure === 'not_found') {
        // The provider removed the page: its Scholarships drop out of
        // results but are never deleted.
        await this.markInactive({ sourceUrl: url }, counts);
        return { url, result: 'not_found' };
      }
      // A flaky server must not wipe data: leave everything as it was.
      counts.failed++;
      return { url, result: 'failed', detail: fetched.failure };
    }
    counts.fetched++;
    if (fetched.needsJs) {
      counts.needs_js++;
      return { url, result: 'needs_js' };
    }

    const sections = split(entry, fetched);
    if (sections.length === 0) {
      // A split rule that finds nothing usually means the page was
      // redesigned: flag it rather than wipe its Scholarships.
      counts.empty++;
      return { url, result: 'empty' };
    }
    let extracted = 0;
    // One Scholarship's failed extraction leaves it as it was without
    // holding back the source's others.
    const failures: string[] = [];
    for (const section of sections) {
      try {
        const done = await this.upsertScholarship(entry, section);
        counts[done]++;
        if (done === 'extracted') extracted++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        failures.push(`${section.schemeName}: ${reason}`);
      }
    }
    // A scheme the source no longer lists drops out of results; a renamed
    // one goes this way too and comes back above as a new Scholarship.
    await this.markInactive(
      {
        sourceUrl: url,
        schemeName: { $nin: sections.map((s) => s.schemeName) },
      },
      counts,
    );
    if (failures.length > 0) {
      counts.failed++;
      return {
        url,
        result: 'failed',
        detail: `Extraction failed for ${failures.join('; ')}`,
      };
    }
    return { url, result: extracted > 0 ? 'ok' : 'unchanged' };
  }

  // Extracts and upserts one section's Scholarship. When its content hash
  // shows the text is the same as last time, and it was read by today's
  // extraction (EXTRACTION_VERSION), the stored extraction is used instead
  // of reading the page again: that is what the Review report showed and
  // what an Override added or removed since applies to or restores. The
  // Scholarship's Override, if any, is checked against that extraction.
  private async upsertScholarship(
    entry: WatchlistEntry,
    { schemeName, text, officialUrl, criteria: structured }: Section,
  ): Promise<'unchanged' | 'extracted'> {
    const key: ScholarshipKey = { sourceUrl: entry.url, schemeName };
    const contentHash = sha256(text);
    const stored = await this.scholarships.findOne(key).lean();
    const previous =
      stored?.contentHash === contentHash &&
      stored.extractionVersion === EXTRACTION_VERSION
        ? storedExtraction(stored)
        : undefined;
    // A failed extraction throws before anything is written: a new
    // Scholarship isn't stored, a changed one keeps its previous version,
    // and with no new hash saved the next run tries again.
    const extraction = previous ?? (await this.extract(text, structured));
    const override = await this.overrides.findOne(key).lean();
    // Unchanged text read again under a newer EXTRACTION_VERSION: what an
    // approve was written for is gone.
    const readAgain = stored?.contentHash === contentHash && !previous;
    const check =
      override &&
      checkOverride(
        override,
        contentHash,
        text,
        extraction.criteria,
        readAgain,
      );
    const review = check?.result === 'applied' ? check.review : undefined;

    const { extraRequirements, amountText, deadline } = extraction;
    const criteria = review?.criteria ?? extraction.criteria;
    const url = officialUrl ?? entry.officialUrl;
    const confidence = scholarshipConfidence(criteria, url);
    const scholarship: Scholarship = {
      name: schemeName,
      provider: entry.provider,
      type: entry.scholarshipType,
      amountText,
      ...(deadline && { deadline }),
      officialUrl: url,
      ...key,
      contentHash,
      lastVerified: this.clock.now(),
      // A source back after a 404 with the same text is listed again.
      status: 'active',
      confidence,
      // Zero Criteria would show as Eligible to everyone, unless a person
      // checked that.
      needsReview: !review && (confidence === 'low' || criteria.length === 0),
      criteria,
      extractedCriteria: extraction.criteria,
      extractionVersion: EXTRACTION_VERSION,
      extraRequirements,
      ...(review && {
        reviewedBy: review.reviewedBy,
        reviewedAt: review.reviewedAt,
      }),
    };
    // A deadline the changed page no longer states, or a review whose
    // Override no longer holds, must not linger.
    const stale = (['deadline', 'reviewedBy', 'reviewedAt'] as const).filter(
      (field) => scholarship[field] === undefined,
    );
    await this.scholarships.updateOne(
      key,
      {
        $set: scholarship,
        $unset: Object.fromEntries(stale.map((field) => [field, 1])),
      },
      { upsert: true },
    );
    // Recorded only once the Scholarship is stored, for the Review report.
    if (override && check) {
      await this.overrides.updateOne(
        { _id: override._id },
        check.result === 'invalid' || check.result === 'lapsed'
          ? { lastResult: check.result, problems: check.problems }
          : { lastResult: check.result, $unset: { problems: 1 } },
      );
    }
    return previous ? 'unchanged' : 'extracted';
  }

  // One LLM call per new or changed text. Structured JSON Criteria (high)
  // replace any extracted one for the same field, so an LLM value there
  // can't lower the Scholarship's Confidence.
  private async extract(
    text: string,
    structured: Criterion[] | undefined,
  ): Promise<Extraction> {
    const extraction = await this.extractor.extract(text);
    return {
      ...extraction,
      criteria: withStructured(structured, extraction.criteria),
    };
  }
}

// The extraction a Scholarship was stored with, if it was kept.
function storedExtraction(stored: Scholarship): Extraction | undefined {
  const { extractedCriteria, extraRequirements, amountText, deadline } = stored;
  if (!extractedCriteria) return undefined;
  return {
    criteria: extractedCriteria,
    extraRequirements,
    amountText,
    ...(deadline && { deadline }),
  };
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
