import type { WatchlistEntry } from '../src/watchlist/watchlist-entry.schema.js';
import { ADMIN_TOKEN, Harness, startApp } from './harness.js';

const GIRLS = 'https://example.org/girls-merit';
const BOYS = 'https://example.org/boys-science';
const SANTOOR = 'https://www.santoorscholarships.com/';

const DAY_1 = new Date('2026-07-20T09:00:00Z');

const GIRLS_ENTRY = {
  url: GIRLS,
  type: 'html',
  region: 'india',
  name: 'Example Girls Merit Scholarship',
  provider: 'Example Foundation',
  scholarshipType: 'corporate',
  officialUrl: GIRLS,
  holds: 'one',
};

const BOYS_ENTRY: WatchlistEntry = {
  url: BOYS,
  type: 'html',
  region: 'india',
  name: 'Example Boys Science Scholarship',
  provider: 'Example Foundation',
  scholarshipType: 'corporate',
  officialUrl: BOYS,
  holds: 'one',
};

describe('Watchlist admin endpoints', () => {
  let harness: Harness;

  const add = (body: object) =>
    harness
      .http()
      .post('/api/admin/watchlist')
      .set('x-admin-token', ADMIN_TOKEN)
      .send(body);

  const list = async () => {
    const res = await harness
      .http()
      .get('/api/admin/watchlist')
      .set('x-admin-token', ADMIN_TOKEN)
      .expect(200);
    return res.body as Record<string, unknown>[];
  };

  describe('adding and listing', () => {
    afterEach(() => harness.close());

    beforeEach(async () => {
      // Starts from the repo's seed Watchlist.
      harness = await startApp({
        fixtures: { [GIRLS]: 'lifecycle/girls-class-10.html' },
        now: DAY_1,
      });
    });

    it('adds an entry and lists it after the seeded ones', async () => {
      const seeded = await list();
      expect(seeded).toContainEqual(
        expect.objectContaining({ id: expect.any(String), url: SANTOOR }),
      );
      const res = await add(GIRLS_ENTRY).expect(201);
      expect(res.body).toEqual({ id: expect.any(String), ...GIRLS_ENTRY });

      expect(await list()).toEqual([
        ...seeded,
        { id: res.body.id as string, ...GIRLS_ENTRY },
      ]);
    });

    it('keeps operator changes over a restart instead of re-seeding', async () => {
      for (const seeded of await list()) {
        await harness
          .http()
          .delete(`/api/admin/watchlist/${seeded.id as string}`)
          .set('x-admin-token', ADMIN_TOKEN)
          .expect(204);
      }
      const girls = await add(GIRLS_ENTRY).expect(201);

      await harness.restart();

      expect(await list()).toEqual([
        { id: girls.body.id as string, ...GIRLS_ENTRY },
      ]);
    });

    it('ingests an added entry on the next run and matches it', async () => {
      await add(GIRLS_ENTRY).expect(201);
      await harness.ingest();

      const res = await harness
        .http()
        .post('/api/match')
        .send({ gender: 'female', class: 10 })
        .expect(200);
      expect(res.body.eligible).toEqual([
        expect.objectContaining({
          name: 'Example Girls Merit Scholarship',
          officialUrl: GIRLS,
        }),
      ]);
    });

    it("lists each entry's last result after a run", async () => {
      await add(GIRLS_ENTRY).expect(201);
      await harness.ingest();

      // The seeded pages aren't served here, so they read as removed.
      const entries = await list();
      expect(entries).toContainEqual(
        expect.objectContaining({ url: SANTOOR, lastResult: 'not_found' }),
      );
      expect(entries).toContainEqual(
        expect.objectContaining({ url: GIRLS, lastResult: 'ok' }),
      );
    });
  });

  describe('removing', () => {
    beforeEach(async () => {
      harness = await startApp({
        fixtures: {
          [GIRLS]: 'lifecycle/girls-class-10.html',
          [BOYS]: 'lifecycle/boys-class-12.html',
        },
        // Seeded with the boys' source; the girls' one is added by the test.
        watchlist: [BOYS_ENTRY],
        now: DAY_1,
      });
    });

    afterEach(() => harness.close());

    const remove = (id: string) =>
      harness
        .http()
        .delete(`/api/admin/watchlist/${id}`)
        .set('x-admin-token', ADMIN_TOKEN);

    async function eligibleNames(profile: object) {
      const res = await harness
        .http()
        .post('/api/match')
        .send(profile)
        .expect(200);
      return (res.body.eligible as { name: string }[]).map((c) => c.name);
    }

    it('removes an entry from the list', async () => {
      const girls = await add(GIRLS_ENTRY).expect(201);

      await remove(girls.body.id as string).expect(204);

      expect((await list()).map((e) => e.url)).not.toContain(GIRLS);
      expect((await list()).map((e) => e.url)).toContain(BOYS);
    });

    it('answers 404 for an entry that is not on the Watchlist', async () => {
      await remove('64b7f0c2a1b2c3d4e5f60718').expect(404);
      await remove('not-an-id').expect(404);
    });

    it("makes a removed entry's Scholarships inactive on the next run", async () => {
      const girls = await add(GIRLS_ENTRY).expect(201);
      await harness.ingest();
      expect(await eligibleNames({ gender: 'female', class: 10 })).toEqual([
        'Example Girls Merit Scholarship',
      ]);

      await remove(girls.body.id as string).expect(204);
      // Still listed until the next run.
      expect(await eligibleNames({ gender: 'female', class: 10 })).toEqual([
        'Example Girls Merit Scholarship',
      ]);

      const summary = await harness.ingest();
      expect(summary.counts.inactive).toBe(1);
      expect(summary.sources.map((s) => s.url)).toEqual([BOYS]);
      expect(await eligibleNames({ gender: 'female', class: 10 })).toEqual([]);
      expect(await eligibleNames({ gender: 'male', class: 12 })).toEqual([
        'Example Boys Science Scholarship',
      ]);
    });
  });

  describe('validation', () => {
    beforeAll(async () => {
      harness = await startApp({ fixtures: {}, now: DAY_1 });
    });

    afterAll(() => harness.close());

    const without = (field: string) => {
      const copy: Record<string, unknown> = { ...GIRLS_ENTRY };
      delete copy[field];
      return copy;
    };

    it.each<[string, object, string]>([
      ['a missing URL', without('url'), 'url is required'],
      [
        'a URL that is not http(s)',
        { ...GIRLS_ENTRY, url: 'ftp://example.org/x' },
        'url must be an http or https URL',
      ],
      [
        'an unknown source type',
        { ...GIRLS_ENTRY, type: 'docx' },
        'type must be one of html, pdf, json',
      ],
      [
        'an unknown region',
        { ...GIRLS_ENTRY, region: 'mars' },
        'region must be one of india, abroad',
      ],
      ['a blank name', { ...GIRLS_ENTRY, name: '  ' }, 'name is required'],
      ['a missing provider', without('provider'), 'provider is required'],
      [
        'an unknown scholarship type',
        { ...GIRLS_ENTRY, scholarshipType: 'private' },
        'scholarshipType must be one of government, corporate, university',
      ],
      [
        'a missing official URL',
        without('officialUrl'),
        'officialUrl is required',
      ],
      [
        'an unknown holds value',
        { ...GIRLS_ENTRY, holds: 'some' },
        'holds must be one of one, many',
      ],
      [
        'a many-scholarship source with no split rule',
        { ...GIRLS_ENTRY, holds: 'many' },
        'split is required when holds is many',
      ],
      [
        'an HTML split rule with no selector',
        { ...GIRLS_ENTRY, holds: 'many', split: {} },
        'split.splitSelector is required for an html source',
      ],
      [
        'an HTML split selector that is not a heading',
        { ...GIRLS_ENTRY, holds: 'many', split: { splitSelector: 'div.card' } },
        'split.splitSelector must be a heading tag (h1 to h6)',
      ],
      [
        'a JSON split rule with no name field',
        {
          ...GIRLS_ENTRY,
          type: 'json',
          holds: 'many',
          split: { itemsPath: 'data.items' },
        },
        'split.nameField is required for a json source',
      ],
      [
        'a PDF split rule with no pattern',
        { ...GIRLS_ENTRY, type: 'pdf', holds: 'many', split: {} },
        'split.splitPattern is required for a pdf source',
      ],
      [
        'a PDF split pattern that is not a valid regex',
        {
          ...GIRLS_ENTRY,
          type: 'pdf',
          holds: 'many',
          split: { splitPattern: '^(Scheme' },
        },
        'split.splitPattern must be a valid regular expression',
      ],
      [
        'a split rule on a one-scholarship source',
        { ...GIRLS_ENTRY, split: { splitSelector: 'h2' } },
        'split is only allowed when holds is many',
      ],
    ])('rejects %s with a clear reason', async (_, body, reason) => {
      const res = await add(body).expect(400);
      expect(res.body.message).toContain(reason);
    });

    it.each([
      ['POST', () => harness.http().post('/api/admin/watchlist')],
      ['GET', () => harness.http().get('/api/admin/watchlist')],
      [
        'DELETE',
        () =>
          harness
            .http()
            .delete('/api/admin/watchlist/64b7f0c2a1b2c3d4e5f60718'),
      ],
    ])('requires the admin token to %s', async (_, call) => {
      await call().send(GIRLS_ENTRY).expect(401);
      await call().set('x-admin-token', 'wrong').send(GIRLS_ENTRY).expect(401);
    });

    it('lists every reason an entry is rejected', async () => {
      const res = await add({ ...GIRLS_ENTRY, type: 'docx', name: '' }).expect(
        400,
      );
      expect(res.body.message).toEqual([
        'type must be one of html, pdf, json',
        'name is required',
      ]);
    });

    it('rejects a URL already on the Watchlist', async () => {
      const res = await add({ ...GIRLS_ENTRY, url: SANTOOR }).expect(409);
      expect(res.body.message).toBe(`${SANTOOR} is already on the Watchlist`);
    });

    it('accepts a many-scholarship source with its split rule', async () => {
      const body = {
        ...GIRLS_ENTRY,
        url: 'https://example.org/many',
        holds: 'many',
        split: { splitSelector: 'h2' },
      };
      const res = await add(body).expect(201);
      expect(res.body).toEqual({ id: expect.any(String), ...body });
    });

    it('defaults holds to one and drops fields the operator cannot set', async () => {
      const res = await add({
        ...without('holds'),
        url: 'https://example.org/defaults',
        lastResult: 'ok',
        extra: true,
      }).expect(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        ...GIRLS_ENTRY,
        url: 'https://example.org/defaults',
        holds: 'one',
      });
    });
  });
});
