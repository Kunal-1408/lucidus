// Post-deploy smoke check: node scripts/smoke.mjs https://<service>.onrender.com
// The free tier may be asleep, so the first request is given time to wake it.
const base = (process.argv[2] ?? process.env.SMOKE_URL ?? '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: node scripts/smoke.mjs <base-url>');
  process.exit(2);
}

const checks = [
  {
    name: 'App page is served',
    run: async () => {
      const res = await fetch(`${base}/`, { signal: AbortSignal.timeout(90_000) });
      const html = await res.text();
      expect(res.status === 200, `status ${res.status}`);
      expect(html.includes('<app-root'), 'no <app-root> in the page');
    },
  },
  {
    name: 'Match returns results',
    run: async () => {
      const res = await post('/api/match', { gender: 'female', class: 12 });
      const body = await res.json();
      expect(res.status === 200, `status ${res.status}`);
      expect(Array.isArray(body.eligible), 'no eligible list in the response');
    },
  },
  {
    name: 'Admin rejects a missing token',
    run: async () => {
      const res = await post('/api/admin/ingest', {});
      expect(res.status === 401, `status ${res.status}`);
    },
  },
];

let failed = 0;
for (const check of checks) {
  try {
    await check.run();
    console.log(`ok    ${check.name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL  ${check.name}: ${error.message}`);
  }
}
process.exitCode = failed ? 1 : 0;

function post(path, body) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}
