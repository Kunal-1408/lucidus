// Full-page screenshots of the app at desktop and phone width, for checking a UI
// change by eye without the Chrome extension:
//   node scripts/screenshot.mjs <base-url> [path ...] [--profile <file.json>] [--out <dir>]
// Paths are app routes without the leading slash (`results`, `saved`), since Git
// Bash rewrites `/results` into a Windows path; no path means the home page.
// `--profile` loads a Profile into local storage before the app starts, so
// `results` shows real buckets; the JSON uses the frontend's Profile keys and
// values (`frontend/src/app/profile-fields.ts`).
// Uses the installed Chrome or Edge, so no browser download is needed.
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
};

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const profileFile = option('--profile');
const out = resolve(option('--out') ?? 'screenshots');
const [baseArg, ...paths] = args;
const base = (baseArg ?? '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: node scripts/screenshot.mjs <base-url> [path ...] [--profile <file.json>] [--out <dir>]');
  process.exit(2);
}
const profile = profileFile ? readFileSync(profileFile, 'utf8') : undefined;
mkdirSync(out, { recursive: true });

await wake();
const browser = await launch();
let problems = 0;
try {
  for (const path of paths.length ? paths : ['']) {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage({ viewport });
      if (profile) {
        await page.addInitScript((json) => {
          localStorage.setItem('scholarship-finder.profile', json);
        }, profile);
      }
      // What the screenshot can't show: script errors and failed API calls.
      page.on('pageerror', (error) => report(`page error: ${error.message}`));
      page.on('console', (msg) => msg.type() === 'error' && report(`console: ${msg.text()}`));
      page.on('response', (res) => res.status() >= 400 && report(`${res.status()} ${res.url()}`));

      await page.goto(`${base}/${path.replace(/^\//, '')}`, { waitUntil: 'networkidle', timeout: 90_000 });
      const file = join(out, `${slug(path)}-${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`saved ${file}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
process.exitCode = problems ? 1 : 0;

// The free tier sleeps, and while it wakes Render serves its own loading page
// with a 503, so wait until the API answers before taking any screenshot.
async function wake() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(30_000) }).catch(() => undefined);
    if (res?.ok) return;
    await new Promise((done) => setTimeout(done, 5_000));
  }
  throw new Error(`${base}/api/health did not answer within 2 minutes`);
}

async function launch() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // Not installed; try the next one.
    }
  }
  return chromium.launch(); // Playwright's own Chromium, if `npx playwright install chromium` was run
}

function report(message) {
  problems++;
  console.log(`WARN  ${message}`);
}

function slug(path) {
  return path.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'home';
}
