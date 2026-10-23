import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WatchlistEntry } from './watchlist-entry.schema.js';

// Resolves to backend/data from both src/watchlist and dist/watchlist.
const SEED_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'data',
  'watchlist.json',
);

// Seeds the Watchlist from the repo's JSON file, only when the collection is
// empty, so a fresh deploy starts with the curated list.
@Injectable()
export class WatchlistSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(WatchlistSeeder.name);

  constructor(
    @InjectModel(WatchlistEntry.name)
    private readonly watchlist: Model<WatchlistEntry>,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.watchlist.countDocuments()) > 0) return;
    const entries = JSON.parse(
      await readFile(SEED_FILE, 'utf8'),
    ) as WatchlistEntry[];
    await this.watchlist.insertMany(entries);
    this.logger.log(`Seeded ${entries.length} Watchlist entries`);
  }
}
