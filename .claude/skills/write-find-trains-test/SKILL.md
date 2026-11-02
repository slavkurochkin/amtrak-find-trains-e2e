---
name: write-find-trains-test
description: Write or extend Playwright tests for the amtrak.com "Find trains" form in this repo, following its Page Object, builder and no-fixed-wait conventions. Use whenever the user asks to add, write, cover, automate or test a scenario, edge case, negative case or bug on the booking form (stations, dates, travelers, trip type, swap, FIND TRAINS), or to add a locator or page-object method, even if they don't say "skill".
---

# Writing a Find-trains test

Goal: a test that reads like the user journey, talks only to page objects, waits only on conditions, and passes twice in a row against live amtrak.com. `CLAUDE.md` has the full rules and Amtrak quirks; read it first if you haven't this session.

## 1. Spec first

Every test verifies a requirement in `specs/find-trains/*.md` (format in `specs/README.md`).
- Find the requirement (`grep -rn "###" specs/find-trains/`). If it doesn't exist, add it with the next free ID in that area (`STN-13`…), a Given/When/Then, and `**Status:** gap`.
- If the behaviour isn't clear, check the live page first (step 3) and write what it actually does.

## 2. Pin down the test

Write the test title first, as the expected behaviour: `'<action/condition> <expected result>'`, e.g. `'switching back to one-way clears the return date'`.
Decide the area and file:

| Area | File | Tag |
|---|---|---|
| Valid search → request payload | `tests/find-trains/search-submission.spec.ts` | `@smoke` |
| From/To, swap, autocomplete | `tests/find-trains/stations.spec.ts` | `@negative` for invalid input |
| Calendar, depart/return | `tests/find-trains/dates.spec.ts` | `@negative` for invalid dates |
| Traveler counts and rules | `tests/find-trains/travelers.spec.ts` | `@negative` for rule violations |
| Trip type, form-wide required fields | `tests/find-trains/form-validation.spec.ts` (or a new `trip-type.spec.ts`) | `@negative` |
| Amtrak bug repro | where the area fits | `@known-bug` (excluded by default) |

Check the file first: if a test already covers it, extend that test instead of adding a near-duplicate.

## 3. Check what the page objects already offer

`homePage.fareFinder` exposes `tripType`, `from`, `to`, `calendar`, `travelers`, `swapButton`, `departInput`, `returnInput`, `findTrainsButton`, `message(text)`, plus `fill()`, `pickDepartDate()`, `pickDateRange()`, `swapStations()`, `waitForStationsToSettle()`, `clickFindTrains()`, `expectSearchEnabled()` and `expectSearchDisabled()`. Skim `src/components/*.ts` for the rest.

If what you need exists, go to step 5.

## 4. Missing element? Look at the live page, then extend the component

Don't guess selectors. List what's actually on the page:

```bash
node .claude/skills/write-find-trains-test/scripts/inspect-form.mjs                         # form at rest
node .claude/skills/write-find-trains-test/scripts/inspect-form.mjs --click traveler-dropdown-button   # after opening something
```

It prints visible elements with their `amt-auto-test-id`, role, accessible name, `data-julie`, `aria-disabled` and text. (Run `npm test -- --project=setup` once first if `.auth/consent.json` is missing.) For a richer interactive session, use the Playwright MCP planner agent (`.claude/agents/playwright-test-planner.md`).

Then add the locator or method to the **component**, not the spec:
- Locator priority: `this.byTestId('<amt-auto-test-id>')` → `getByRole(role, { name })` → `this.visible('[data-julie=…]')`. Everything must be visible-filtered (the site renders the form twice).
- Actions a report reader should see go in `step('Verb object: detail', async () => { … })`.
- A method that changes state ends with an assertion that the change happened (e.g. `expectSelected`).
- New user-facing copy goes in `src/data/messages.ts`; new stations in `src/data/stations.ts`.

## 5. Write the test

Start from the template and keep Arrange / Act / Assert separated by blank lines:

```ts
import { test, expect } from '@src/fixtures/test';
import { aSearch } from '@src/builders/SearchCriteriaBuilder';
import { Stations } from '@src/data/stations';
import { Messages } from '@src/data/messages';
import { daysFromToday, toInputFormat } from '@src/utils/dates';
import { expectRequestToMatch } from '@src/utils/SearchRequestSpy';

test('<behaviour in plain words>', { tag: ['@negative', '@REQ-01'] }, async ({ homePage, searchSpy }) => {
  const form = homePage.fareFinder;
  // Arrange: only what this behaviour needs
  await form.from.selectByCode(Stations.NEW_YORK);

  // Act: the one thing under test
  await form.clickFindTrains();

  // Assert: user-visible result, and the request (or its absence)
  await form.expectSearchDisabled();
  await searchSpy.expectNoSearch();
});
```

Every test carries its requirement tag (`@AREA-NN`) plus `@negative` / `@smoke` where relevant.

Patterns:
- **Valid search:** `const search = aSearch().roundTrip(2).from(Stations.BOSTON).build(); await form.fill(search); await form.clickFindTrains(); expectRequestToMatch(await searchSpy.waitForSearch(), search);`
- **Blocked search:** `await form.expectSearchDisabled(); await form.clickFindTrains(); await searchSpy.expectNoSearch();`
- **Message:** `await expect(form.message(Messages.X)).toBeVisible();`
- **Calendar state:** `await expect(form.calendar.day(daysFromToday(n))).toHaveAttribute('aria-disabled', 'true');`
- **Traveler count:** `await expect(form.travelers.countLabel('child')).toHaveText('2');`
- **Swap:** call `await form.waitForStationsToSettle()` before `swapStations()` unless you're testing the swap bug.

Never in a spec: raw selectors, `page.waitForTimeout`, literal timeouts, hardcoded dates, `expect(await locator.x()).toBe(…)` (read-once checks don't retry). For an interaction the site drops now and then, retry on the outcome with `await expect(async () => { … }).toPass()`. Its budget is in `playwright.config.ts`.

## 6. Verify

```bash
npx playwright test <file> -g "<title>" --repeat-each=2   # must pass every time
npm run typecheck
npm run spec:coverage                                     # after flipping the status to automated
```

If another Playwright run may be active (IDE extension), prefix with `PW_OUTPUT_DIR=/tmp/wt/results PW_REPORTS_DIR=/tmp/wt/reports`.
If it fails, read `reports/failures.md` (error, steps, page snapshot) before changing anything. Fix the cause; don't add sleeps or loosen the assertion. If the site really behaves wrongly, it's a finding: tag the test `@known-bug`, add evidence to `docs/evidence/`, and note it under README "Findings".

## 7. Finish

- Set the requirement's status to `automated` (or `known-bug`) and make sure `npm run spec:coverage` is clean.
- If you learned a new site quirk, add it to the "Amtrak quirks" section of `CLAUDE.md`.
- Report to the user: the test title(s), file, the pass result, and any finding.
