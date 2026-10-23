import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { CLOCK, Clock } from '../src/clock.js';
import { configureApp } from '../src/configure-app.js';
import { HTTP_FETCH, HttpFetch } from '../src/ingestion/fetcher.js';
import {
  POINTER_COUNTRIES,
  PointerCountry,
  WORQNOW,
  WorqNowClient,
  WorqNowUniversity,
} from '../src/universities/worqnow.js';
import { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';

export const ADMIN_TOKEN = 'test-admin-token';
const FIXTURES = join(import.meta.dirname, 'fixtures');

// What the fake web serves for one URL: a fixture file name under
// test/fixtures, a bare HTTP status, or a network error.
export type Served = string | { status: number } | { networkError: true };

// What the fake WorqNow returns for one country: its universities with
// international scholarships, or a failed fetch.
export type WorqNowServed = WorqNowUniversity[] | { failure: string };

export interface HarnessOptions {
  // Source URL → what it serves. Any other URL 404s.
  fixtures: Record<string, Served>;
  now: Date;
  // Replaces the repo's seed Watchlist for this test.
  watchlist?: WatchlistEntry[];
  // Country → what the fake WorqNow returns. Any other country has none.
  worqnow?: Partial<Record<PointerCountry, WorqNowServed>>;
}

export interface Harness {
  http: () => ReturnType<typeof request>;
  // Changes what a URL serves from now on.
  serve: (url: string, served: Served) => void;
  // Changes what the fake WorqNow returns for a country from now on.
  serveWorqNow: (country: PointerCountry, served: WorqNowServed) => void;
  // Holds every fetch of a URL until the returned release is called.
  hold: (url: string) => () => void;
  setNow: (now: Date) => void;
  // Triggers an Ingestion run and resolves with its summary once it ends.
  ingest: () => Promise<RunSummaryBody>;
  // Reads a run's summary as it stands.
  summary: (runId: string) => Promise<RunSummaryBody>;
  // Stops the app mid-flight and starts a fresh one on the same database,
  // like the host sleeping and waking.
  restart: () => Promise<void>;
  // A collection's model, for seeding state a test can't reach through the
  // API (e.g. the needs-review flag). Never for asserting.
  model: <T>(name: string) => Model<T>;
  close: () => Promise<void>;
}

export interface RunSummaryBody {
  runId: string;
  state: string;
  counts: Record<string, number>;
  sources: { url: string; result: string; detail?: string }[];
}

// The real Nest app against an in-memory MongoDB, with only the edges faked:
// the web is served from committed fixtures and the clock is pinned.
export async function startApp(options: HarnessOptions): Promise<Harness> {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.ADMIN_TOKEN = ADMIN_TOKEN;

  const web = new FakeWeb(options.fixtures);
  const worqnow = new FakeWorqNow(options.worqnow ?? {});
  let now = options.now;
  const clock: Clock = { now: () => now };

  let app = await createApp(web, worqnow, clock, options.watchlist);
  const http = () => request(app.getHttpServer());

  const summary = async (runId: string) => {
    const res = await http()
      .get(`/api/admin/ingest/${runId}`)
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    return res.body as RunSummaryBody;
  };

  return {
    http,
    serve: (url, served) => web.serve(url, served),
    serveWorqNow: (country, served) => worqnow.serve(country, served),
    hold: (url) => web.hold(url),
    setNow: (date) => {
      now = date;
    },
    summary,
    ingest: async () => {
      const res = await http()
        .post('/api/admin/ingest')
        .set('x-admin-token', ADMIN_TOKEN)
        .expect(202);
      return waitForRun(summary, res.body.runId as string);
    },
    restart: async () => {
      await app.close();
      web.abandonHeld();
      app = await createApp(web, worqnow, clock);
    },
    model: <T>(name: string) => app.get<Model<T>>(getModelToken(name)),
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}

async function createApp(
  web: FakeWeb,
  worqnow: FakeWorqNow,
  clock: Clock,
  watchlist?: WatchlistEntry[],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(HTTP_FETCH)
    .useValue(web.fetch)
    .overrideProvider(WORQNOW)
    .useValue(worqnow)
    .overrideProvider(CLOCK)
    .useValue(clock)
    .compile();
  if (watchlist) {
    // Inserted before bootstrap, so the seeder finds the collection filled.
    await moduleRef
      .get<Model<WatchlistEntry>>(getModelToken(WatchlistEntry.name))
      .insertMany(watchlist);
  }
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}

export async function waitForRun(
  summary: (runId: string) => Promise<RunSummaryBody>,
  runId: string,
  until: (s: RunSummaryBody) => boolean = (s) => s.state !== 'running',
): Promise<RunSummaryBody> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    const body = await summary(runId);
    if (until(body)) return body;
    if (Date.now() > deadline) {
      throw new Error(`Run ${runId} never settled: ${JSON.stringify(body)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

class FakeWeb {
  private readonly served: Map<string, Served>;
  private readonly held = new Map<string, Promise<void>>();

  constructor(fixtures: Record<string, Served>) {
    this.served = new Map(Object.entries(fixtures));
  }

  serve(url: string, served: Served) {
    this.served.set(url, served);
  }

  hold(url: string): () => void {
    let release!: () => void;
    this.held.set(url, new Promise<void>((resolve) => (release = resolve)));
    return () => {
      this.held.delete(url);
      release();
    };
  }

  // Fetches held by a stopped app never return, as in a dead process, and
  // the new app's fetches are no longer held.
  abandonHeld() {
    this.held.clear();
  }

  readonly fetch: HttpFetch = async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    await this.held.get(url);
    const served = this.served.get(url);
    if (served === undefined) return new Response('Not found', { status: 404 });
    if (typeof served === 'object') {
      if ('networkError' in served) throw new TypeError('fetch failed');
      return new Response(`Status ${served.status}`, served);
    }
    return new Response(await readFile(join(FIXTURES, served)));
  };
}

class FakeWorqNow implements WorqNowClient {
  private readonly served: Map<PointerCountry, WorqNowServed>;

  constructor(served: Partial<Record<PointerCountry, WorqNowServed>>) {
    this.served = new Map(
      POINTER_COUNTRIES.map((c) => [c, served[c] ?? []] as const),
    );
  }

  serve(country: PointerCountry, served: WorqNowServed) {
    this.served.set(country, served);
  }

  universitiesWithScholarships(
    country: PointerCountry,
  ): Promise<WorqNowUniversity[]> {
    const served = this.served.get(country) ?? [];
    if ('failure' in served) return Promise.reject(new Error(served.failure));
    return Promise.resolve(served);
  }
}
