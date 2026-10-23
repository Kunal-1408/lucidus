import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AdminController } from './admin/admin.controller.js';
import { AppController } from './app.controller.js';
import { CLOCK, systemClock } from './clock.js';
import { Fetcher, HTTP_FETCH } from './ingestion/fetcher.js';
import { IngestionService } from './ingestion/ingestion.service.js';
import { MatchController } from './match/match.controller.js';
import {
  Scholarship,
  ScholarshipSchema,
} from './scholarships/scholarship.schema.js';
import {
  WatchlistEntry,
  WatchlistEntrySchema,
} from './watchlist/watchlist-entry.schema.js';
import { WatchlistSeeder } from './watchlist/watchlist-seeder.js';

// The built Angular app, served from the same service as the API.
const FRONTEND_DIST = join(
  import.meta.dirname,
  '..',
  '..',
  'frontend',
  'dist',
  'frontend',
  'browser',
);

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({ uri: requireEnv('MONGODB_URI') }),
    }),
    MongooseModule.forFeature([
      { name: Scholarship.name, schema: ScholarshipSchema },
      { name: WatchlistEntry.name, schema: WatchlistEntrySchema },
    ]),
    ...(existsSync(FRONTEND_DIST)
      ? [
          ServeStaticModule.forRoot({
            rootPath: FRONTEND_DIST,
            exclude: ['/api/{*path}'],
          }),
        ]
      : []),
  ],
  controllers: [AppController, MatchController, AdminController],
  providers: [
    WatchlistSeeder,
    Fetcher,
    IngestionService,
    { provide: HTTP_FETCH, useValue: globalThis.fetch },
    { provide: CLOCK, useValue: systemClock },
  ],
})
export class AppModule {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is not set`);
  return value;
}
