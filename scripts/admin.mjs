// The admin endpoints from the command line, so neither Postman nor pasting the
// token is needed. Reads ADMIN_TOKEN and SMOKE_URL from the gitignored root .env:
//   node --env-file=.env scripts/admin.mjs <command>
// Commands:
//   watchlist                     list the Watchlist
//   watchlist add <entry.json>    add an entry (one object, same shape as backend/data/watchlist.json)
//   watchlist remove <id>
//   overrides                     list Overrides
//   overrides add <override.json>
//   overrides remove <id>
//   ingest                        start a run, wait for it to end, print its summary
//   ingest <runId>                print a run's summary
//   review                        the Review report
//   audit                         stored Criteria no valid Profile could satisfy
// Prints the JSON response; exits 1 on an error response or a run that didn't finish.
import { readFileSync } from 'node:fs';

const base = (process.env.SMOKE_URL ?? '').replace(/\/$/, '');
const token = process.env.ADMIN_TOKEN;
if (!base || !token) {
  console.error('Set ADMIN_TOKEN and SMOKE_URL in .env and run with `node --env-file=.env`');
  process.exit(2);
}

const [command, action, arg] = process.argv.slice(2);
const collections = { watchlist: '/api/admin/watchlist', overrides: '/api/admin/overrides' };

if (command in collections) {
  const path = collections[command];
  if (!action) print(await call('GET', path));
  else if (action === 'add' && arg) print(await call('POST', path, JSON.parse(readFileSync(arg, 'utf8'))));
  else if (action === 'remove' && arg) print(await call('DELETE', `${path}/${encodeURIComponent(arg)}`));
  else usage();
} else if (command === 'ingest') {
  print(action ? await call('GET', `/api/admin/ingest/${action}`) : await ingest());
} else if (command === 'review') {
  print(await call('GET', '/api/admin/review'));
} else if (command === 'audit') {
  print(await call('GET', '/api/admin/audit'));
} else {
  usage();
}

// Starts a run, or follows the one already in progress (409), until it ends.
async function ingest() {
  const res = await request('POST', '/api/admin/ingest');
  const body = await res.json();
  if (res.status !== 202 && res.status !== 409) fail(res.status, body);
  if (res.status === 409) console.error(`A run is already in progress; following ${body.runId}`);
  else console.error(`Started run ${body.runId}`);
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    await new Promise((done) => setTimeout(done, 10_000));
    const summary = await call('GET', `/api/admin/ingest/${body.runId}`);
    if (summary.state !== 'running') {
      if (summary.state !== 'finished') process.exitCode = 1;
      return summary;
    }
    console.error(`still running: ${JSON.stringify(summary.counts)}`);
  }
  console.error(`Run ${body.runId} still running after 15 minutes; check it with \`ingest ${body.runId}\``);
  process.exit(1);
}

async function call(method, path, body) {
  const res = await request(method, path, body);
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : undefined;
  if (!res.ok) fail(res.status, parsed);
  return parsed;
}

// The free tier may be asleep, so the first request is given time to wake it.
function request(method, path, body) {
  return fetch(`${base}${path}`, {
    method,
    headers: { 'x-admin-token': token, ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
}

function print(value) {
  console.log(value === undefined ? 'ok' : JSON.stringify(value, null, 2));
}

function fail(status, body) {
  console.error(`HTTP ${status}: ${JSON.stringify(body)}`);
  process.exit(1);
}

function usage() {
  console.error('Usage: node --env-file=.env scripts/admin.mjs watchlist|overrides [add <file.json> | remove <id>] | ingest [runId] | review | audit');
  process.exit(2);
}
