# Amtrak "Find trains" – automated test suite

Playwright + TypeScript end-to-end tests for the **"Find trains" search form on [amtrak.com/home](https://www.amtrak.com/home)**, built with the Page Object pattern.

Scope: the homepage search form and its inputs, **up to the FIND TRAINS click**. Results and booking pages are out of scope.

**Status:** 57 requirement tests plus a seed test and a one-time setup step (59 in a run), all passing on desktop Chromium against production on 2026-11-02; the `@smoke` subset also passes on Firefox, WebKit and mobile Chrome. The station tests also passed 4 repeats under parallel load. A known-bug repro runs on demand with `npm run test:known-bugs`. Evidence is in [`docs/evidence/`](docs/evidence/README.md).

AI assistants: start with [`CLAUDE.md`](CLAUDE.md) (also linked as `AGENTS.md`).

---

## Quick start

Requirements: **Node.js 18+** (developed on Node 25) and an internet connection (tests run against live amtrak.com).

```bash
npm ci                                  # install dependencies
npx playwright install chromium         # download the test browser (add --with-deps on Linux CI)
npm test                                # full suite on desktop Chromium (headless)
```

Other ways to run:

| Command | What it does |
|---|---|
| `npm run test:smoke` | Happy-path searches only (`@smoke`) |
| `npm run test:cross-browser` | `@smoke` on Firefox, WebKit and mobile Chrome (nightly in CI) |
| `npm run test:all` | Every project |
| `npm run test:negative` | Validation / negative tests only (`@negative`) |
| `npm run test:known-bugs` | Repro of the Amtrak swap bug (fails while the bug exists; not part of the default run) |
| `npm run test:headed` | Watch the browser while tests run |
| `npm run test:ui` | Playwright UI mode (time-travel debugging) |
| `npx playwright test -g "swap"` | Run tests whose title matches |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | TypeScript check |
| `npm run lint` / `npm run format` | ESLint (incl. Playwright rules: no fixed waits, no missing `await`) / Prettier |
| `npm run check` | Lint + format check + typecheck + spec coverage (the pre-commit hook runs this) |
| `npm run spec:coverage` | Check tests ↔ requirements in `specs/`; list open gaps |
| `npm run test:visual:update` / `:linux` | Re-approve visual baselines on macOS / in the Linux Docker image CI uses |
| `npx playwright test --grep @STN-08` | Run the tests for one requirement |

### Environment (all optional, see `.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://www.amtrak.com` | Point at another environment (e.g. staging) |
| `TEST_TZ` | `America/New_York` | Time zone for the browser **and** for computing "today" in tests (the calendar disables past dates by browser clock) |
| `PW_OUTPUT_DIR` / `PW_REPORTS_DIR` | `test-results` / `reports` | Separate output folders, e.g. when an IDE runner and a terminal run at the same time |

### Timing options (no hardcoded waits)

Tests wait on conditions: web-first assertions, `waitForResponse`, and the home page counting as ready only once its station data has loaded. They're bounded by `actionTimeout` / `expect.timeout` in `playwright.config.ts`. The few time-based values that can't be expressed as a condition are typed **fixture options** in the config's `use` block (defined in `src/utils/timing.ts`). Override them per project, or per file with `test.use({...})`:

| Option | Default | Why it's time-based |
|---|---|---|
| `stationSettleMs` | 1000 | Pause before Swap. There's no DOM signal for "settled", and swapping sooner hits Amtrak's swap bug |
| `noSearchWindowMs` | 2000 | Negative tests prove a request is *not* sent; absence can only be observed over a window |
| `typingDelayMs` | 80 | Keystroke cadence for key-by-key typing tests |

Station entry uses Playwright's `expect(...).toPass()` to re-enter text the site occasionally drops (finding 6). Its retry budget is `expect.toPass.timeout` in the config.

### Mocked-backend tests

Most tests run against the live site. Failure modes the live site can't produce on demand are tested by mocking **one** API while the rest of the page stays real (`@mocked`, `src/utils/StationLookupMock.ts`):
- the station lookup returning 500 (fallback list, specs STN-13),
- the lookup held back until the test releases it (deterministic "Loading" state, no timers, STN-14).

### Outputs

- `reports/html/` – HTML report (every test has a screenshot; failures add trace + video)
- `reports/junit.xml` – for CI dashboards
- `reports/failures.md` – **AI-ready failure summary** (see [CI and AI debugging](#ci-and-ai-assisted-debugging))
- `test-results/<test>/` – per-test screenshot, trace, video, captured `search-request-N.json`

---

## Project structure

```
src/
  pages/            BasePage (navigation, cookie banner), HomePage
  components/       One class per form widget, composed by FareFinderForm
    FareFinderForm.ts   the whole "Find trains" form + FIND TRAINS button
    StationField.ts     From / To autocomplete
    DatePicker.ts       two-month calendar
    TravelersPanel.ts   traveler-type steppers
    TripTypeMenu.ts     One-Way / Round-Trip / Multi-City
  builders/         SearchCriteriaBuilder – fluent test data with defaults
  data/             Stations, user-facing messages (one place to update copy)
  fixtures/         Playwright fixtures: homePage, searchSpy, timing options
  utils/            SearchRequestSpy (network contract), dates, timing, step()
  reporters/        ai-failure-reporter.ts
tests/setup/        one-time cookie-consent setup (saved browser state)
tests/find-trains/  specs grouped by form area
tests/seed.spec.ts  starting point for Playwright's AI test agents
CLAUDE.md           rules and quirks for AI assistants (AGENTS.md links to it)
.claude/agents/     Playwright planner / generator / healer agents (+ .mcp.json)
specs/              test plans written by the planner agent
.github/workflows/  CI
docs/evidence/      run log, JUnit, screenshots, captured requests, bug evidence
```

### Design patterns and why

- **Page Object Model with components.** `HomePage` owns a `FareFinderForm`, which composes `StationField` ×2, `DatePicker`, `TravelersPanel` and `TripTypeMenu`. Widgets are separate classes because they recur across amtrak.com (Schedules and Train Status reuse the station search), so a new page reuses them instead of copying selectors.
- **Builder** (`aSearch().roundTrip(4).from(Stations.BOSTON).build()`). Every test starts from a valid default (one-way NYP→WAS, 14 days out, 1 adult) and states only what it cares about. Dates are relative to "today", so tests never go stale.
- **Fixtures.** `homePage` (loaded and ready) and `searchSpy` (attached before navigation), plus timing options. Tests declare what they need and contain no setup code.
- **Setup project for the cookie banner.** It runs once, clicks "Reject All", and saves only the consent cookies; every test starts from that state, so the banner never appears. Bot-protection cookies are deliberately not reused.
- **Readiness by data, not time.** The form renders before its station data arrives, so `HomePage` waits for `data.stations.json` and `data.popularstations.json` before a test starts.
- **Network contract check at the scope boundary.** FIND TRAINS sends `POST /dotcom/journey-solution-option` with JSON (`type: OW|RT`, legs with origin/destination codes and dates, one passenger per traveler). `SearchRequestSpy` captures it, `expectRequestToMatch()` compares it with the builder's criteria, and the request is **aborted**. That proves the click does the right thing without depending on the results page, and without sending automated search load to Amtrak's backend.
- **Locators.** Amtrak's own `amt-auto-test-id` attributes first, then ARIA roles and names (`role=option`, calendar `gridcell` named "Monday, November 16, 2026"). Every lookup is filtered to `visible`, because the site renders each form twice (desktop and mobile layouts).
- **Named steps** (`step('Select to station: WAS', …)`) in page objects, so reports and traces read like a user journey.

---

## What is tested and why (spec-driven)

The form's job is to turn user input into a correct search, and to refuse input that can't be searched. Tests cover both, plus the edge cases most likely to break.

**Requirements live in [`specs/find-trains/`](specs/README.md)**, one file per area. Each behaviour has an ID, a Given/When/Then and a status (`automated`, `gap`, `known-bug`, `out-of-scope`). Every test is tagged with the ID(s) it verifies, so `npx playwright test --grep @DATE-12` runs one requirement. `npm run spec:coverage` (also run in CI) fails if a test has no requirement, uses an unknown ID, or a status doesn't match the tests.

| Area | Spec | Positive / edge | Negative |
|---|---|---|---|
| Submission | [`SUB`](specs/find-trains/submission.md) | One-way, round-trip, all traveler types, today, swapped route, traveler-party matrix, Use Points (`pricingUnit: POINTS`). Each checks the exact request payload | – |
| Stations | [`STN`](specs/find-trains/stations.md) | Suggestions, exact code, lowercase code, keyboard selection, swap, slow lookup shows "Loading" (mocked) | Unknown station, HTML injection, same From/To, lookup API failure falls back to a built-in list (mocked) |
| Dates | [`DATE`](specs/find-trains/dates.md) | Today, months ahead, round-trip range, same-day return, 11-month horizon, typed date | Past dates, previous month, return before departure, closed calendar, invalid / past / too-far typed dates |
| Travelers | [`TRAV`](specs/find-trains/travelers.md) | Default, total, Reset, 8 allowed, "Traveling Alone?" policy | 9+, no adult, children alone, counter floor |
| Trip type | [`TRIP`](specs/find-trains/trip-type.md) | One-way default, round-trip back to one-way, Multi-City legs (`type: MC`), Group Travel page | – |
| Coupons | [`CPN`](specs/find-trains/coupons.md) | – | Only letters and digits, max 14 |
| Accessibility / visual | [`A11Y`, `VIS`](specs/find-trains/accessibility.md) | Travelers panel matches its approved screenshot | No new WCAG violations: form, suggestions, calendar, travelers panel |
| Required fields | [`REQ`](specs/find-trains/required-fields.md) | Assistance needed opens the Accessible Travel Services dialog first | Empty form, From only, missing To, missing date, round trip without return. Each also checks no request is sent |

Current coverage is printed by `npm run spec:coverage`: 56 of 58 in-scope requirements have tests (1 is a known-bug repro). The two open gaps are listed on purpose: STN-10 (popular stations on focus) and CPN-02 (invalid-coupon feedback).

## Findings on amtrak.com

1. **Bug – Swap shows the wrong route.** Clicking Swap within ~300 ms of choosing the To station leaves **both fields showing the To station** (e.g. CHI → CHI), with no "same station" error. The search that's sent uses the correctly swapped route (CHI → NYP). The user sees one route and searches another. Reproduced 3/3 at 0 ms and 300 ms delay, 0/2 at 800 ms or more. Covered by a `@known-bug` test that asserts the correct behaviour, so it fails while the bug exists. It's a race and can't reproduce every time, so it isn't a CI gate: run it with `npm run test:known-bugs`. Evidence: [`docs/evidence/bug-swap-race-ui-shows-CHI-CHI.png`](docs/evidence/bug-swap-race-ui-shows-CHI-CHI.png).
2. **Copy inconsistency – adult age.** The travelers panel labels Adult as **16+**, but the validation message says *"Add at least one adult **18** years old or older."*
3. **Copy inconsistency – date format.** The date field hint says `MM/DD/YYYY`, but values display without leading zeros (`11/6/2026`).
4. **UX – firewall-blocked queries fail silently.** HTML-like station queries get **403** from the autocomplete API. The dropdown shows "Loading", then goes blank with no message. That's safe, since nothing executes, but the user gets no feedback.
5. **Accessibility note – keyboard.** In the station dropdown the first ArrowDown keeps focus on the input, and focus enters the list only on the second press. Enter on the input triggers the "Nearby" geolocation lookup ("Location blocked…" when location access is denied).
6. **Bug – typed keys land in the wrong field.** Focus jumps between the station fields on its own. After clicking From/To it sometimes moves to the suggestion header, so the first keys are lost (typing `BOS` searched `OS`). Shortly after a station is picked it moves back to that station field, so a date typed next ends up there: **"WAS/2026" in To** ([evidence](docs/evidence/bug-focus-jump-date-typed-into-to-field.png)). It's timing-dependent and more frequent under load, so it's documented (spec STN-11) rather than gated. Page objects verify every entry and retry with `expect(...).toPass()`, and tests type dates before picking stations.

---

7. **Accessibility (WCAG 2.1 A/AA, axe-core).** The form at rest has 2 critical and 3 serious violation types:
   - unsupported ARIA attributes on the dropdown buttons,
   - incomplete trip-type tabs,
   - low-contrast field labels,
   - the "1 Traveler" button's name not matching its text,
   - a nested interactive Use Points switch.

   The station list nests group headers inside the listbox. In the travelers panel the **five count inputs have no labels** (critical: a screen reader can't tell Adult from Infant). The calendar is clean. These are baselined in `src/data/a11yBaseline.ts`, so tests fail only on new violations (specs `A11Y-*`).

8. **Resilience (mocked backend).** When the station-lookup API fails, the app retries 3 times and then falls back to a built-in station list, so the search still works. In that fallback the best match isn't first (Back Bay before South Station for "Boston").

9. **UX – coupon rejected silently.** With coupon `X000` entered, FIND TRAINS stays disabled and nothing says why (spec CPN-02, a gap until a real coupon is available to pin down the valid format).

## Assumptions

- **Production is the target.** No staging access, so the suite runs read-only against amtrak.com and never completes a search.
- **The search request is the observable result of FIND TRAINS.** Under automation Amtrak's bot protection (Akamai) answers it with **403**, and the page shows "We've experienced an unknown error". So "the click worked" means "the correct request was sent".
- **Browsers:** the full suite runs on desktop Chromium (1440×900), which is the PR gate. Firefox, WebKit (Safari engine) and mobile Chrome (Pixel 7) run the `@smoke` subset nightly (`npm run test:cross-browser`). On mobile the date field is read-only (calendar only), and Done/FIND TRAINS are tapped like a finger (Playwright's scroll-before-click lands on the content under pinned buttons; see `BaseComponent.pressPinnedButton`).
- **Station data is stable** (NYP, WAS, BOS, CHI, PHL and their labels).
- **Time zone:** "today" follows `America/New_York` for both the browser and the tests.
- The cookie banner is dismissed once with **Reject All**, as a privacy-preferring user would, and that consent is reused by all tests.

---

## Working with AI

The repo is set up for AI assistants both to **write** tests and to **debug** them:

- **Spec-driven workflow**: requirement in `specs/` first, then a test tagged with its ID, then `npm run spec:coverage`. An AI (or a person) always knows what to test next: the gaps list.
- **`write-find-trains-test` skill** (`.claude/skills/`): Claude Code loads it automatically when asked to add a test. It walks through writing the spec, choosing the file and tag, reusing page objects, finding real locators on the live page (`scripts/inspect-form.mjs` lists the form's test ids, roles and states), a spec template, and verification (pass twice, typecheck). `trip-type.spec.ts` was written by following it.
- **[`CLAUDE.md`](CLAUDE.md)** (`AGENTS.md` links to it): commands, where things live, rules (page objects only, no fixed waits, retrying assertions, builder data), a recipe for adding a test, and the Amtrak quirks behind most past failures.
- **Playwright test agents** (`npx playwright init-agents --loop=claude`, in `.claude/agents/` + `.mcp.json`):
  - **planner** explores the live page in a real browser and writes a test plan to `specs/`
  - **generator** turns a plan into a test
  - **healer** runs failing tests and fixes them

  They all start from `tests/seed.spec.ts`, which uses our fixtures, so the browser opens on a ready home page with the cookie banner handled. Each agent file ends with a short project-rules section, because the stock generator writes raw locators. Its output is treated as a draft and moved onto the page objects.
- **Named steps and typed page objects** give an AI a small vocabulary that reads like the UI ("Select to station: WAS").
- **`reports/failures.md`** gives an AI everything needed to debug a failure in one file (next section).

Example: *"Add a test that the Add Coupon dropdown opens"* triggers the skill. Or: *"Use the playwright-test-planner agent to plan tests for the Add Coupon dropdown, then implement them following CLAUDE.md."*

---

## CI and AI-assisted debugging

`.github/workflows/e2e.yml` runs on push to `main`, on every PR, nightly (Amtrak changes even when this repo doesn't), and on demand with an optional `grep` input (e.g. `@smoke`).

When a test fails you get, in increasing depth:

1. **Inline annotations** on the PR diff (Playwright `github` reporter).
2. **AI failure summary** (`reports/failures.md`) in the **job summary** and as a **sticky PR comment**. Per failed test it has the spec `file:line`, the clean error with expected vs received, the code frame, the named steps leading to the failure, the **page's accessibility snapshot at the moment of failure**, and artifact paths. Paste it into an AI assistant or point one at the PR comment. A real example: [`docs/evidence/example-ai-failure-summary.md`](docs/evidence/example-ai-failure-summary.md).
3. **Artifacts:** `reports-*` (HTML report, JUnit, failures.md) and `test-results-*` (trace, video, screenshot, captured request JSON). Open a trace with `npx playwright show-trace trace.zip` or at trace.playwright.dev.

The same `failures.md` is written on local runs.

CI uses 2 workers and 2 retries. Flaky-then-passing tests show up as **flaky** in the report rather than hiding.

> Caveat: GitHub-hosted runners use datacenter IPs, which Amtrak's bot protection may challenge more often than a home connection. If the page itself gets blocked in CI, the options are a self-hosted runner or an allow-listed test environment from Amtrak.

---

## With more time

- **Mobile and cross-browser projects.** Locators already filter for the visible layout. Add `devices['iPhone 14']` plus Firefox/WebKit and fix what differs.
- **Remaining form features:** Multi-City (repeatable legs make a good component), Group Travel, coupons, "Use Points", the disability flow, and unaccompanied youth ("Traveling Alone?").
- **Mocked-backend layer.** Fulfil the station autocomplete and search endpoints with fixtures, for deterministic, fast, firewall-independent tests (e.g. autocomplete error states, slow responses), while keeping a thin live smoke suite.
- **Accessibility checks** with `@axe-core/playwright` on the form and its open states, and visual comparisons of the open calendar and travelers panel.
- **Data-driven matrices** for traveler combinations and date boundaries (the furthest bookable date, month/year rollover).
- **Lint/format** (ESLint + Prettier) and a pre-commit hook.
- **Report the findings** above to Amtrak with the evidence.
