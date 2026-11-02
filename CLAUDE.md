# CLAUDE.md – guide for AI assistants working on this repo

Playwright + TypeScript tests for the **"Find trains" form on amtrak.com/home** (live production site).
Scope ends at the FIND TRAINS click: we assert the search **request** it sends, never the results page.

## Commands

```bash
npm test                              # full suite (setup project runs first)
npx playwright test tests/find-trains/stations.spec.ts -g "swap"   # one file / matching tests
npm run test:smoke | test:negative    # by tag
npm run test:known-bugs               # Amtrak bug repros (expected to fail; not a gate)
npm run typecheck                     # must pass before you're done
npm run spec:coverage                 # tests <-> specs/ requirements
```

If another Playwright run may be active (e.g. the VS Code extension), isolate yours:
`PW_OUTPUT_DIR=/tmp/x/test-results PW_REPORTS_DIR=/tmp/x/reports npx playwright test`.

## Writing a new test

**Spec first:** every test verifies a requirement in `specs/find-trains/*.md` and is tagged with its ID (`{ tag: ['@negative', '@STN-08'] }`). Add or update the requirement before the test; `npm run spec:coverage` (also in CI) checks the links. Format and workflow: `specs/README.md`.

Use the **`write-find-trains-test`** skill (`.claude/skills/write-find-trains-test/SKILL.md`): step-by-step workflow, spec template, and `scripts/inspect-form.mjs` to list real locators on the live form.

## Where things are

| Need | Go to |
|---|---|
| Write a test | `tests/find-trains/<area>.spec.ts`, import `test, expect` from `@src/fixtures/test` |
| Interact with the form | `homePage.fareFinder` → `.from` / `.to` (StationField), `.calendar` (DatePicker), `.travelers`, `.tripType`, `.swapStations()`, `.clickFindTrains()` |
| Fill a whole valid search | `form.fill(aSearch()....build())` |
| Assert what FIND TRAINS sent | `expectRequestToMatch(await searchSpy.waitForSearch(), criteria)` |
| Assert nothing was sent | `await searchSpy.expectNoSearch()` |
| Stations / copy text | `src/data/stations.ts`, `src/data/messages.ts` |
| Dates | `src/utils/dates.ts` (`daysFromToday`, `toInputFormat`) – never hardcode a date |
| Timings | `src/utils/timing.ts`, values in `playwright.config.ts` `use` |

## Rules

1. **Specs talk to page objects only.** No raw selectors in `tests/`. Missing locator? Add it to the component in `src/components/`.
2. **Locator priority:** `amt-auto-test-id` (via `byTestId`) → ARIA role/name → `data-julie`. Always narrow to visible: the site renders the form **twice** (desktop + mobile).
3. **No fixed waits.** No `waitForTimeout` or literal timeouts in specs; use web-first assertions (`await expect(locator)...`), `waitForResponse`, or `expect.poll`. The only time-based waits are the named options in `timing.ts`.
4. **Retrying assertions only:** `await expect(locator).toHaveText(...)`, not `expect(await locator.innerText())`.
5. **Test data via the builder** (`aSearch()`), dates relative to today.
6. Each test: one behaviour, Arrange / Act / Assert separated by blank lines, title says the expected behaviour. Tag negative tests `@negative`, core submission `@smoke`.
7. Page-object actions that a reader should see in reports go in `step('…', …)` (`src/utils/step.ts`).
8. Done = the new test passes **twice in a row** and `npm run typecheck` is clean.

## Amtrak quirks (learned the hard way)

- **Readiness:** the form is visible before its station data loads. `HomePage` waits for `data.stations.json` / `data.popularstations.json`; reuse `requiredData` for new pages.
- **Cookie banner:** handled once by `tests/setup/consent.setup.ts` (saved consent cookies). Don't add banner handling to tests.
- **Station input:** use `StationField.enter()` (one input event) for setup; `type()` is only for keyboard-behaviour tests. Typing an exact code (e.g. `BOS`) auto-selects it. After selection the input is hidden and a chip shows `CODE City, ST Station`.
- **Keyboard:** first ArrowDown keeps focus on the input; Enter on the input triggers the "Nearby" geolocation lookup.
- **Lost input:** after a click the app may move focus to the suggestion header, and under load may wipe fresh input. `StationField` verifies each entry landed and retries with `expect(...).toPass()`. Copy that pattern for new flaky-by-design interactions; don't add sleeps.
- **Date inputs** are covered by a floating label: open with `form.openDepartCalendar()` (force click). Values show as `11/6/2026` (no zero padding). Round-trip: **Done is disabled until a return date is picked**.
- **FIND TRAINS** is `aria-disabled`, not HTML-disabled; `clickFindTrains()` force-clicks so negative tests can click it.
- **Swap bug:** swapping <~300ms after picking To shows the same station in both fields. Call `form.waitForStationsToSettle()` before swapping unless you're testing that bug. The repro is tagged `@known-bug`, excluded by default, run with `npm run test:known-bugs`.
- **Search request** `POST /dotcom/journey-solution-option` is aborted by the spy (it would get a bot-protection 403 anyway). Seniors are `"seniors"` in the payload.
- **Travelers:** max 8 online (9 shows the 1-800-USA-RAIL message), at least 1 adult required.

## Debugging a failure

1. Read `reports/failures.md`: error, code frame, named steps, page accessibility snapshot, artifact paths.
2. Open the trace: `npx playwright show-trace test-results/<test>/trace.zip`.
3. Check the live page before changing a locator (Playwright MCP below, or a quick script).

## AI test agents (Playwright MCP)

`.mcp.json` starts Playwright's test MCP server; `.claude/agents/` has its **planner** (explores the live page, writes a plan to `specs/`), **generator** (turns a plan into a test) and **healer** (fixes failing tests). They start from `tests/seed.spec.ts`, which uses our fixtures. Generated code is a draft: refactor it onto the page objects per the rules above.
