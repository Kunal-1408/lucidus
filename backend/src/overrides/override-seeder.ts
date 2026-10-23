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
import { CLOCK, type Clock } from '../clock.js';
import { parseOverride } from './override-input.js';
import { Override } from './override.schema.js';

// The repo's overrides file; injected so tests can seed their own.
export const OVERRIDES_FILE = Symbol('OVERRIDES_FILE');

// Resolves to backend/data from both src/overrides and dist/overrides.
export const REPO_OVERRIDES_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'data',
  'overrides.json',
);

// Seeds the Overrides from the repo's JSON file, only when the collection is
// empty, so a fresh deploy keeps the reviewer's fixes. Each is written as
// it would be sent to the admin endpoint; one that isn't valid is skipped
// with a warning rather than stopping the app.
@Injectable()
export class OverrideSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(OverrideSeeder.name);

  constructor(
    @InjectModel(Override.name)
    private readonly overrides: Model<Override>,
    @Inject(OVERRIDES_FILE) private readonly file: string,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.overrides.countDocuments()) > 0) return;
    const written = JSON.parse(await readFile(this.file, 'utf8')) as unknown[];
    const seeded: Override[] = [];
    for (const [i, body] of written.entries()) {
      const parsed = parseOverride(body);
      if (parsed.ok) {
        seeded.push({ ...parsed.override, reviewedAt: this.clock.now() });
      } else {
        this.logger.warn(
          `Skipped Override ${i} in ${this.file}: ${parsed.reasons.join('; ')}`,
        );
      }
    }
    await this.overrides.insertMany(seeded);
    this.logger.log(`Seeded ${seeded.length} Overrides`);
  }
}
