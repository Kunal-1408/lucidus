import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { CLOCK } from '../src/clock.js';
import { configureApp } from '../src/configure-app.js';
import { HTTP_FETCH, HttpFetch } from '../src/ingestion/fetcher.js';

export const ADMIN_TOKEN = 'test-admin-token';
const FIXTURES = join(import.meta.dirname, 'fixtures');

export interface HarnessOptions {
  // Source URL → fixture file name under test/fixtures. Any other URL 404s.
  fixtures: Record<string, string>;
  now: Date;
}

export interface Harness {
  http: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

// The real Nest app against an in-memory MongoDB, with only the edges faked:
// the web is served from committed fixtures and the clock is pinned.
export async function startApp(options: HarnessOptions): Promise<Harness> {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.ADMIN_TOKEN = ADMIN_TOKEN;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(HTTP_FETCH)
    .useValue(fixtureFetch(options.fixtures))
    .overrideProvider(CLOCK)
    .useValue({ now: () => options.now })
    .compile();
  const app: INestApplication = configureApp(moduleRef.createNestApplication());
  await app.init();

  return {
    http: () => request(app.getHttpServer()),
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}

function fixtureFetch(fixtures: Record<string, string>): HttpFetch {
  return async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    const file = fixtures[url];
    if (!file) return new Response('Not found', { status: 404 });
    return new Response(await readFile(join(FIXTURES, file)));
  };
}
