import fs from 'node:fs';
import path from 'node:path';
import { test as setup } from '@playwright/test';
import { CONSENT_STATE_FILE } from '../../src/utils/consentState';

/**
 * Runs once before the suite: dismisses the OneTrust cookie banner with
 * "Reject All" and saves only the consent cookies. Every test then starts
 * with that state, so the banner never appears and never covers the form.
 *
 * Only the Optanon* cookies are kept. Amtrak's bot-protection cookies are
 * left out on purpose so each test gets a fresh session.
 */
setup('save cookie-consent state', async ({ page, context }) => {
  await page.goto('/home', { waitUntil: 'domcontentloaded' });
  try {
    await page.locator('#onetrust-reject-all-handler').click(); // bounded by actionTimeout
    await page.waitForFunction(() => document.cookie.includes('OptanonAlertBoxClosed'));
  } catch {
    // No banner (e.g. a region without one): save an empty state.
  }
  const cookies = (await context.cookies()).filter((c) => c.name.startsWith('Optanon'));
  fs.mkdirSync(path.dirname(CONSENT_STATE_FILE), { recursive: true });
  fs.writeFileSync(CONSENT_STATE_FILE, JSON.stringify({ cookies, origins: [] }, null, 2));
});
