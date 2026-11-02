# Amtrak "Find trains" – automated test suite

Playwright + TypeScript end-to-end tests for the **"Find trains" search form on [amtrak.com/home](https://www.amtrak.com/home)**, built with the Page Object pattern.

Scope: the homepage search form and its inputs, **up to the FIND TRAINS click**. Results and booking pages are out of scope.

**Status:** 39 tests, all passing against production on 2026-11-02 (two consecutive full runs). Evidence is in [`docs/evidence/`](docs/evidence/README.md).

---

## Quick start

Requirements: **Node.js 18+** (developed on Node 25) and an internet connection (tests run against live amtrak.com).

```bash
npm ci                                  # install dependencies
npx playwright install chromium         # download the test browser (add --with-deps on Linux CI)
npm test                                # run the whole suite (headless)
```

Other ways to run:

| Command | What it does |
|---|---|
| `npm run test:smoke` | Happy-path searches only (`@smoke`) |
| `npm run test:negative` | Validation / negative tests only (`@negative`) |
| `npm run test:headed` | Watch the browser while tests run |
| `npm run test:ui` | Playwright UI mode (time-travel debugging) |
| `npx playwright test -g "swap"` | Run tests whose title matches |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | TypeScript check |

### Environment (all optional, see `.env.example`)

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://www.amtrak.com` | Point at another environment (e.g. staging) |
| `TEST_TZ` | `America/New_York` | Time zone for the browser **and** for computing "today" in tests (the calendar disables past dates by browser clock) |
| `LIVE_SEARCH` | `0` | `1` lets the search request reach Amtrak instead of being intercepted (expect a bot-protection 403) |
| `PW_OUTPUT_DIR` / `PW_REPORTS_DIR` | `test-results` / `reports` | Separate output folders, e.g. when an IDE runner and a terminal run at the same time |

### Outputs

- `reports/html/` – HTML report (every test has a screenshot; failures add trace + video)
- `reports/junit.xml` – for CI dashboards
- `reports/failures.md` / `failures.json` – **AI-ready failure summary** (see [CI and AI debugging](#ci-and-ai-assisted-debugging))
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
  fixtures/         Playwright fixtures: homePage, searchSpy
  utils/            SearchRequestSpy (network contract), date helpers, step()
  reporters/        ai-failure-reporter.ts
tests/find-trains/  specs grouped by form area
.github/workflows/  CI
docs/evidence/      run log, JUnit, screenshots, captured requests, bug evidence
```

### Design patterns and why

- **Page Object Model with components.** `HomePage` owns a `FareFinderForm`, which composes `StationField` ×2, `DatePicker`, `TravelersPanel` and `TripTypeMenu`. Widgets are separate classes because they recur across amtrak.com (Schedules and Train Status reuse the station search), so a new page reuses them instead of copying selectors.
- **Builder** (`aSearch().roundTrip(4).from(Stations.BOSTON).build()`). Every test starts from a valid default (one-way NYP→WAS, 14 days out, 1 adult) and states only what it cares about. Dates are relative to "today", so tests never go stale.
- **Fixtures.** `homePage` (loaded, cookie banner handled) and `searchSpy` (attached before navigation). Tests declare what they need and contain no setup code.
- **Network contract check at the scope boundary.** FIND TRAINS sends `POST /dotcom/journey-solution-option` with JSON (`type: OW|RT`, legs with origin/destination codes and dates, one passenger per traveler). `SearchRequestSpy` captures it, `expectRequestToMatch()` compares it with the builder's criteria, and the request is **aborted**. That proves the click does the right thing without depending on the results page, and without sending automated search load to Amtrak's backend.
- **Locators.** Amtrak's own `amt-auto-test-id` attributes first, then ARIA roles and names (`role=option`, calendar `gridcell` named "Monday, November 16, 2026"). Every lookup is filtered to `visible`, because the site renders each form twice (desktop and mobile layouts).
- **Named steps** (`step('Select to station: WAS', …)`) in page objects, so reports and traces read like a user journey.

---

## What is tested and why

The form's job is to turn user input into a correct search, and to refuse input that can't be searched. Tests cover both, plus the edge cases most likely to break.

| Area | Happy path / edge cases | Negative |
|---|---|---|
| **Submission** (`search-submission.spec.ts`, `@smoke`) | One-way; round-trip (2 legs); all 5 traveler types; departure **today**; swap then search. Each asserts the exact request payload. | – |
| **Stations** (`stations.spec.ts`) | City-name suggestions; choosing a suggestion; exact code auto-selects; lowercase code; keyboard-only (ArrowDown + Enter); swap; swap twice | Unknown station → "No stations found." + "Enter a valid station"; HTML/script input not executed or rendered; same From/To → "Enter different origin and destination stations." and no request |
| **Dates** (`dates.spec.ts`) | Today selectable; displayed format; date 4 months out via "Next month"; round-trip range; same-day return | Past dates disabled; clicking a past date does nothing; can't go before the current month; return before departure isn't accepted; closing the calendar leaves the search disabled |
| **Travelers** (`travelers.spec.ts`) | Defaults to 1 adult; summary total; Reset; 8 travelers allowed | 9+ → "Call 1-800-USA-RAIL…" and every "+" disabled; 0 adults → "Add at least one adult…" and search disabled; children without an adult; counter can't go below 0 |
| **Required fields** (`form-validation.spec.ts`, `@negative`) | – | Empty form; From only; missing To; missing date; round trip without return date. Each checks FIND TRAINS is disabled **and** clicking it sends no request |

Not covered on purpose: Multi-City, Group Travel, Rail Passes / Auto Train tabs, coupons, "Use Points" and the disability checkbox. They're secondary to the core search, and adding them is mostly new component classes on the same pattern.

---

## Findings on amtrak.com

1. **Bug – Swap shows the wrong route.** Clicking Swap within ~300 ms of choosing the To station leaves **both fields showing the To station** (e.g. CHI → CHI), with no "same station" error. The search that's sent uses the correctly swapped route (CHI → NYP). The user sees one route and searches another. Reproduced 3/3 at 0 ms and 300 ms delay, 0/2 at 800 ms or more. Covered by a `@known-bug` test marked `test.fail()`: it passes while the bug exists and will flag when Amtrak fixes it. Evidence: [`docs/evidence/bug-swap-race-ui-shows-CHI-CHI.png`](docs/evidence/bug-swap-race-ui-shows-CHI-CHI.png).
2. **Copy inconsistency – adult age.** The travelers panel labels Adult as **16+**, but the validation message says *"Add at least one adult **18** years old or older."*
3. **Copy inconsistency – date format.** The date field hint says `MM/DD/YYYY`, but values display without leading zeros (`11/6/2026`).
4. **UX – firewall-blocked queries fail silently.** HTML-like station queries get **403** from the autocomplete API. The dropdown shows "Loading", then goes blank with no message. That's safe, since nothing executes, but the user gets no feedback.
5. **Accessibility note – keyboard.** In the station dropdown the first ArrowDown keeps focus on the input, and focus enters the list only on the second press. Enter on the input triggers the "Nearby" geolocation lookup ("Location blocked…" when location access is denied).
6. **Observed under parallel load, not confirmed:** once, the tail of text typed into To landed in From ("NYPshington"). It didn't reproduce in isolation. Tests enter station text with one input event (`fill`), so they aren't affected, and real keystroke typing is still covered by dedicated tests.

---

## Assumptions

- **Production is the target.** No staging access, so the suite runs read-only against amtrak.com and never completes a search.
- **The search request is the observable result of FIND TRAINS.** Under automation Amtrak's bot protection (Akamai) answers it with **403**, and the page shows "We've experienced an unknown error". So "the click worked" means "the correct request was sent". Run with `LIVE_SEARCH=1` to see the 403.
- **Desktop Chromium at 1440×900.** Mobile layout and other browsers aren't covered yet.
- **Station data is stable** (NYP, WAS, BOS, CHI, PHL and their labels).
- **Time zone:** "today" follows `America/New_York` for both the browser and the tests.
- The cookie banner is dismissed with **Reject All** before each test, as a privacy-preferring user would.

---

## CI and AI-assisted debugging

`.github/workflows/e2e.yml` runs on push to `main`, on every PR, nightly (Amtrak changes even when this repo doesn't), and on demand with an optional `grep` input (e.g. `@smoke`).

When a test fails you get, in increasing depth:

1. **Inline annotations** on the PR diff (Playwright `github` reporter).
2. **AI failure summary** (`reports/failures.md`) in the **job summary** and as a **sticky PR comment**. Per failed test it has the spec `file:line`, the clean error with expected vs received, the code frame, the named steps leading to the failure, the **page's accessibility snapshot at the moment of failure**, and artifact paths. Paste it into an AI assistant or point one at the PR comment. A real example: [`docs/evidence/example-ai-failure-summary.md`](docs/evidence/example-ai-failure-summary.md).
3. **Artifacts:** `reports-*` (HTML report, JUnit, failures.md/json) and `test-results-*` (trace, video, screenshot, captured request JSON). Open a trace with `npx playwright show-trace trace.zip` or at trace.playwright.dev.

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
