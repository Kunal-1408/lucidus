// Adds the repo's seed Watchlist to a deployed app whose Watchlist is already
// filled (the seeder only fills an empty one):
//   ADMIN_TOKEN=... node scripts/add-watchlist.mjs https://<service>.onrender.com
// Each entry goes through the admin endpoint; one already listed answers 409
// and is left as it is.
import { readFile } from 'node:fs/promises';

const base = (process.argv[2] ?? '').replace(/\/$/, '');
const token = process.env.ADMIN_TOKEN;
if (!base || !token) {
  console.error('Usage: ADMIN_TOKEN=... node scripts/add-watchlist.mjs <base-url>');
  process.exit(2);
}

const seed = new URL('../backend/data/watchlist.json', import.meta.url);
const entries = JSON.parse(await readFile(seed, 'utf8'));

let failed = 0;
for (const entry of entries) {
  const res = await fetch(`${base}/api/admin/watchlist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify(entry),
    // The free tier may be asleep, so the first request is given time to wake it.
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 201) console.log(`added   ${entry.name}`);
  else if (res.status === 409) console.log(`listed  ${entry.name}`);
  else {
    failed++;
    console.log(`FAIL    ${entry.name}: ${res.status} ${await res.text()}`);
  }
}
process.exitCode = failed ? 1 : 0;
