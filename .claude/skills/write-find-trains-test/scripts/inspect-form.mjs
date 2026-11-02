#!/usr/bin/env node
/**
 * Lists the visible, interactive elements of the amtrak.com "Find trains" form
 * so tests are written against real locators instead of guesses.
 *
 * Usage (from the repo root):
 *   node .claude/skills/write-find-trains-test/scripts/inspect-form.mjs
 *   node .claude/skills/write-find-trains-test/scripts/inspect-form.mjs --click traveler-dropdown-button
 *   node .claude/skills/write-find-trains-test/scripts/inspect-form.mjs --click fare-finder-travel-selection --all
 *
 * --click <amt-auto-test-id>  click that element first (repeatable, in order)
 * --all                       list the whole page, not just the booking area
 *
 * Uses the saved cookie consent from the setup project (.auth/consent.json) if present.
 */
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const clicks = args.flatMap((a, i) => (a === '--click' ? [args[i + 1]] : []));
const all = args.includes('--all');
const baseURL = process.env.BASE_URL ?? 'https://www.amtrak.com';
const state = '.auth/consent.json';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'en-US',
  timezoneId: process.env.TEST_TZ ?? 'America/New_York',
  storageState: fs.existsSync(state) ? state : undefined,
});
const page = await context.newPage();

// Same readiness rule as HomePage: the form is usable once its station data loaded.
const ready = Promise.all(
  [/\/services\/data\.stations\.json/, /\/services\/data\.popularstations\.json/].map((re) =>
    page.waitForResponse((r) => re.test(r.url()), { timeout: 45_000 }),
  ),
);
await page.goto(`${baseURL}/home`, { waitUntil: 'domcontentloaded' });
await ready;
await page.locator('#onetrust-reject-all-handler').click({ timeout: 3_000 }).catch(() => {});

for (const id of clicks) {
  console.log(`> click [amt-auto-test-id="${id}"]`);
  await page.locator(`[amt-auto-test-id="${id}"]`).filter({ visible: true }).first().click({ force: true });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800); // exploration script only: let the UI open before listing it
}

const rows = await page.evaluate((all) => {
  const scope = all ? document.body : (document.querySelector('[amt-auto-test-id="fare-finder-cmp"]')?.closest('section, form, div[class*="container"]') ?? document.body);
  const interactive = 'input, button, select, textarea, a, [role], [amt-auto-test-id], [data-julie]';
  const isVisible = (e) => !!(e.offsetParent || e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
  // Overlays (calendar, dropdown panels) can render outside the form container.
  const nodes = new Set([...scope.querySelectorAll(interactive), ...document.querySelectorAll('[role="dialog"] *, [role="listbox"] *, [cdktrapfocus] *')]);
  return [...nodes].filter((e) => isVisible(e) && e.matches(interactive)).map((e) => ({
    tag: e.tagName.toLowerCase(),
    testId: e.getAttribute('amt-auto-test-id') ?? '',
    role: e.getAttribute('role') ?? '',
    name: (e.getAttribute('aria-label') ?? '').slice(0, 40),
    julie: e.getAttribute('data-julie') ?? '',
    disabled: e.getAttribute('aria-disabled') ?? (e.disabled ? 'true' : ''),
    text: (e.innerText ?? e.value ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
  }));
}, all);

const seen = new Set();
console.log(`\n${'testId'.padEnd(42)} ${'role'.padEnd(10)} ${'aria-label'.padEnd(30)} ${'data-julie'.padEnd(26)} dis  text`);
for (const r of rows) {
  const key = JSON.stringify(r);
  if (seen.has(key) || (!r.testId && !r.role && !r.name && !r.julie && !r.text)) continue;
  seen.add(key);
  console.log(`${(r.testId || `<${r.tag}>`).padEnd(42)} ${r.role.padEnd(10)} ${r.name.padEnd(30)} ${r.julie.padEnd(26)} ${(r.disabled || '').padEnd(4)} ${r.text}`);
}
console.log(`\n${seen.size} elements. Prefer amt-auto-test-id, then role + name, then data-julie.`);
await browser.close();
