# Framework guide

Reference for working on the suite. Start with the [README](../README.md); this page has the details.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Full suite on desktop Chromium |
| `npm run test:smoke` / `test:negative` | Only `@smoke` (happy-path searches) / `@negative` tests |
| `npx playwright test --grep @STN-08` | The tests for one requirement |
| `npx playwright test -g "swap"` | Tests whose title matches |
| `npm run test:headed` / `test:ui` | Watch the browser / Playwright UI mode (time-travel debugging) |
| `npm run test:cross-browser` | `@smoke` on Firefox, WebKit and mobile Chrome |
| `npm run test:all` | Every project |
| `npm run test:known-bugs` | Repro of the Amtrak swap bug F-01 (fails while the bug exists; not in the default run) |
| `npm run report` | Open the last HTML report |
| `npm run spec:coverage` | Check tests ↔ requirements in `specs/`; list open gaps |
| `npm run check` | Lint + format check + typecheck + spec coverage (what the pre-commit hook runs) |
| `npm run lint` / `format` / `typecheck` | ESLint (incl. Playwright rules) / Prettier / TypeScript |
| `npm run test:visual:update` / `:linux` | Re-approve visual baselines on macOS / in the Linux Docker image CI uses |

## Environment (all optional, see `.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://www.amtrak.com` | Point at another environment (e.g. staging) |
| `TEST_TZ` | `America/New_York` | Time zone of the browser **and** of "today" in tests (the calendar disables past dates by the browser clock) |
| `PW_OUTPUT_DIR` / `PW_REPORTS_DIR` | `test-results` / `reports` | Separate output folders, e.g. when an IDE runner and a terminal run at the same time |

## Outputs

- `reports/`: the run summary for people.
  - `html/` is the HTML report: every test has a screenshot; failures add a trace and a video.
  - `junit.xml` is for CI dashboards.
  - `failures.md` is the AI-ready failure summary (see below).
- `test-results/<test>/`: raw per-test artifacts. These are the screenshot, trace, video and captured `search-request-N.json`. Playwright clears this folder at the start of every run.

## Waiting and timing

Tests wait on **conditions**: web-first assertions, `waitForResponse`, and the home page counting as ready only once its station data has loaded. These are bounded by `actionTimeout` / `expect.timeout` in `playwright.config.ts`. ESLint forbids `waitForTimeout` in tests.

Three values can't be expressed as a condition. They are set **once**, in `playwright.config.ts` under `use`, and read with `timing()` (`src/utils/timing.ts`):

| Option | Value | Why it's time-based |
|---|---|---|
| `stationSettleMs` | 1000 | Pause before Swap. There's no DOM signal for "settled", and swapping sooner hits the swap bug (F-01) |
| `noSearchWindowMs` | 2000 | Negative tests prove a request is *not* sent; absence can only be observed over a window |
| `typingDelayMs` | 80 | Keystroke cadence for key-by-key typing tests |

The site occasionally drops fresh input (finding F-02). Station and date entry check that the text actually landed, and retry with Playwright's `expect(...).toPass()`, which is bounded by `expect.toPass.timeout` in the config.

## Mocked-backend tests

Most tests run against the live site. Failure modes it can't produce on demand are tested by mocking **one** API (the station lookup) while the rest of the page stays real. These tests are tagged `@mocked` and use `src/utils/StationLookupMock.ts`:
- STN-13: the lookup returns 500, and the app falls back to its built-in station list.
- STN-14: the lookup is held until the test releases it, which makes the "Loading" state deterministic without timers.

## Browsers

- **Chrome:** the full suite on desktop Chromium (1440×900). This is the default, locally and on GitHub.
- **Other browsers:** Firefox, WebKit (Safari engine) and mobile Chrome (Pixel 7) run the `@smoke` subset, with 2 workers and 1 retry (`npm run test:cross-browser`, or "all" on GitHub).
- **Mobile differences:**
  - The date field is read-only (calendar only), so typed-date tests skip there.
  - Done and FIND TRAINS are tapped like a finger (`BaseComponent.pressPinnedButton`). Playwright's own click scrolls first, which puts other content under these pinned buttons.

## CI and AI-assisted debugging

`.github/workflows/e2e.yml` runs inside the official Playwright Docker image, **only when started by hand**: Actions → "E2E - Find trains" → Run workflow. You choose Chrome only or all browsers, and can optionally give a `grep` filter. Since the tests drive the live amtrak.com, whose terms restrict automated access, it deliberately doesn't run on every push, on pull requests or on a schedule. Lint, format, typecheck and spec coverage run before the tests.

When a test fails you get, in increasing depth:
1. **Annotations** on the run, pointing at the failing lines (Playwright `github` reporter).
2. **`reports/failures.md`** on the run's summary page. Per failure it has:
   - the spec `file:line`;
   - the clean error with expected vs received, and the code frame;
   - the named steps leading to the failure;
   - the page's accessibility snapshot at that moment;
   - artifact paths. Attempts of tests that passed on retry are marked **FLAKY**.

   Example: [`evidence/example-ai-failure-summary.md`](evidence/example-ai-failure-summary.md).
3. **Artifacts:** `reports-*` and `test-results-*`. Open a trace with `npx playwright show-trace trace.zip`.

CI uses 2 workers and 2 retries; tests that pass on retry show up as flaky, not as passes.
GitHub-hosted runners use datacenter IPs, which Amtrak's bot protection may challenge more often. If the page itself gets blocked, use a self-hosted runner or an allow-listed test environment.

## Working with AI

- **[`.claude/CLAUDE.md`](../.claude/CLAUDE.md)** (`AGENTS.md` in the repo root links to it) has the rules, commands and Amtrak quirks for AI assistants.
- **The `write-find-trains-test` skill** (`.claude/skills/`) is a spec-first workflow for adding a test. It includes `.claude/skills/write-find-trains-test/scripts/inspect-form.mjs`, which lists the live form's test ids, roles and states.
- **Playwright test agents** (`.claude/agents/`, `.mcp.json`) are the planner, generator and healer from `npx playwright init-agents`. They start from `tests/seed.spec.ts`, which uses our fixtures. Their output is treated as a draft and moved onto the page objects.

## Full project structure

```
specs/find-trains/   requirements, one file per area (source of truth)
tests/find-trains/   one test file per spec file, each test tagged with its requirement ID
tests/setup/         one-time cookie-consent setup (saved browser state)
tests/seed.spec.ts   starting point for Playwright's AI agents
src/pages/           BasePage (navigation, readiness by data), HomePage
src/components/      BaseComponent, FareFinderForm, StationField, DatePicker, TravelersPanel, TripTypeMenu
src/builders/        SearchCriteriaBuilder
src/data/            stations, user-facing messages, accessibility baseline
src/fixtures/        homePage, searchSpy
src/utils/           SearchRequestSpy, StationLookupMock, a11y, dates, timing, consent state
src/reporters/       ai-failure-reporter.ts
scripts/             spec-coverage.mjs
docs/                findings.md, FRAMEWORK.md, evidence/
.claude/             write-find-trains-test skill, Playwright agents
.githooks/           pre-commit checks
.github/workflows/   CI
```
