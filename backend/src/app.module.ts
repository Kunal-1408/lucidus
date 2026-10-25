import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AdminController } from './admin/admin.controller.js';
import { AuditController } from './admin/audit.controller.js';
import { OverridesController } from './admin/overrides.controller.js';
import { ReviewController } from './admin/review.controller.js';
import { WatchlistController } from './admin/watchlist.controller.js';
import { AppController } from './app.controller.js';
import { CLOCK, systemClock } from './clock.js';
import { AnthropicLlmClient } from './ingestion/anthropic-llm.js';
import { EXTRACTOR, llmExtractor } from './ingestion/extractor.js';
import { Fetcher, HTTP_FETCH } from './ingestion/fetcher.js';
import {
  IngestionRun,
  IngestionRunSchema,
} from './ingestion/ingestion-run.schema.js';
import { IngestionService } from './ingestion/ingestion.service.js';
import { LLM_CLIENT, type LlmClient } from './ingestion/llm.js';
import { MatchController } from './match/match.controller.js';
import { Override, OverrideSchema } from './overrides/override.schema.js';
import {
  OVERRIDES_FILE,
  OverrideSeeder,
  REPO_OVERRIDES_FILE,
} from './overrides/override-seeder.js';
import {
  SavedScholarship,
  SavedScholarshipSchema,
} from './saved/saved-scholarship.schema.js';
import { SavedController } from './saved/saved.controller.js';
import {
  Scholarship,
  ScholarshipSchema,
} from './scholarships/scholarship.schema.js';
import {
  UniversityPointer,
  UniversityPointerSchema,
} from './universities/university-pointer.schema.js';
import { UniversityPointersService } from './universities/university-pointers.service.js';
import { HttpWorqNowClient, WORQNOW } from './universities/worqnow.js';
import {
  SeededSource,
  SeededSourceSchema,
} from './watchlist/seeded-source.schema.js';
import {
  WatchlistEntry,
  WatchlistEntrySchema,
} from './watchlist/watchlist-entry.schema.js';
import {
  REPO_WATCHLIST_FILE,
  WATCHLIST_FILE,
  WatchlistSeeder,
} from './watchlist/watchlist-seeder.js';

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
      { name: SeededSource.name, schema: SeededSourceSchema },
      { name: IngestionRun.name, schema: IngestionRunSchema },
      { name: UniversityPointer.name, schema: UniversityPointerSchema },
      { name: SavedScholarship.name, schema: SavedScholarshipSchema },
      { name: Override.name, schema: OverrideSchema },
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
  controllers: [
    AppController,
    MatchController,
    AdminController,
    WatchlistController,
    OverridesController,
    ReviewController,
    AuditController,
    SavedController,
  ],
  providers: [
    WatchlistSeeder,
    { provide: WATCHLIST_FILE, useValue: REPO_WATCHLIST_FILE },
    OverrideSeeder,
    { provide: OVERRIDES_FILE, useValue: REPO_OVERRIDES_FILE },
    Fetcher,
    IngestionService,
    UniversityPointersService,
    { provide: WORQNOW, useClass: HttpWorqNowClient },
    { provide: HTTP_FETCH, useValue: globalThis.fetch },
    { provide: LLM_CLIENT, useClass: AnthropicLlmClient },
    {
      provide: EXTRACTOR,
      useFactory: (llm: LlmClient) => llmExtractor(llm),
      inject: [LLM_CLIENT],
    },
    { provide: CLOCK, useValue: systemClock },
  ],
})
export class AppModule {}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} is not set`);
  return value;
}
