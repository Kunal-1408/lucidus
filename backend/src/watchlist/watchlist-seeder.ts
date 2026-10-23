import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SeededSource } from './seeded-source.schema.js';
import { WatchlistEntry } from './watchlist-entry.schema.js';

// The repo's seed file; injected so tests can seed their own.
export const WATCHLIST_FILE = Symbol('WATCHLIST_FILE');

// Resolves to backend/data from both src/watchlist and dist/watchlist.
export const REPO_WATCHLIST_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'data',
  'watchlist.json',
);

// Seeds the Watchlist from the repo's JSON file on every boot, adding only
// entries it has never seeded before: a deploy brings in new seed entries,
// and an entry the operator removed stays removed. An entry already listed
// (added by hand, or seeded before this was recorded) is left as it is.
@Injectable()
export class WatchlistSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(WatchlistSeeder.name);

  constructor(
    @InjectModel(WatchlistEntry.name)
    private readonly watchlist: Model<WatchlistEntry>,
    @InjectModel(SeededSource.name)
    private readonly seeded: Model<SeededSource>,
    @Inject(WATCHLIST_FILE) private readonly file: string,
  ) {}

  async onApplicationBootstrap() {
    const entries = JSON.parse(
      await readFile(this.file, 'utf8'),
    ) as WatchlistEntry[];
    const seeded = new Set((await this.seeded.find().lean()).map((s) => s.url));
    const listed = new Set(
      (await this.watchlist.find({}, { url: 1 }).lean()).map((e) => e.url),
    );
    const unseeded = entries.filter((e) => !seeded.has(e.url));
    const fresh = unseeded.filter((e) => !listed.has(e.url));
    if (fresh.length > 0) {
      await this.watchlist.insertMany(fresh);
      this.logger.log(`Seeded ${fresh.length} Watchlist entries`);
    }
    // Recorded after the insert: a crash in between leaves them listed, so
    // the next boot still skips them.
    if (unseeded.length > 0) {
      await this.seeded.insertMany(unseeded.map((e) => ({ url: e.url })));
    }
  }
}
