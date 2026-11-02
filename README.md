# Amtrak "Find trains" – automated test suite

Playwright + TypeScript tests for the **"Find trains" search form on [amtrak.com/home](https://www.amtrak.com/home)**, from the form's inputs **up to the FIND TRAINS click** (results and booking are out of scope).

**Status (2026-11-02, against production):** 63 tests pass on desktop Chromium. The `@smoke` subset also runs on Firefox, WebKit and mobile Chrome. Evidence: [`docs/evidence/`](docs/evidence/README.md).

## Quick start

Requires **Node.js 18+** and an internet connection (the tests run against the live site).

```bash
npm ci                            # install the exact dependency versions from package-lock.json
npx playwright install chromium   # download the test browser
npm test                          # run the full suite (desktop Chromium, headless)
```

| Also useful | |
|---|---|
| `npm run test:headed` | Watch the browser while tests run |
| `npx playwright test --grep @STN-08` | Run the tests for one requirement |
| `npm run report` | Open the HTML report of the last run |
| `npm run spec:coverage` | Show which requirements are tested, and the open gaps |

No environment setup is needed. Optional variables (`BASE_URL`, `TEST_TZ`), every command, outputs and CI are described in **[`docs/FRAMEWORK.md`](docs/FRAMEWORK.md)**.

## Approach

**Test the request, not the results page.** Clicking FIND TRAINS sends `POST /dotcom/journey-solution-option` with the search as JSON: trip type, legs with station codes and dates, and one passenger per traveler. That request is the exact outcome of the click and the edge of the scope. A spy captures it, compares it with what the test entered, and aborts it, so no automated searches reach Amtrak's backend (it answers bots with 403 anyway).

**Design**
- **Page objects split into components.** `HomePage` → `FareFinderForm` → `StationField`, `DatePicker`, `TravelersPanel`, `TripTypeMenu` (in `src/components/`). Widgets like the station search recur across amtrak.com, so they're reusable on their own.
- **Builder for test data.** `aSearch().roundTrip(3).from(Stations.BOSTON).build()`: valid defaults, dates relative to today, so each test states only what matters.
- **Fixtures.** Tests receive a ready `homePage` and the `searchSpy`, and contain no setup code.
- **Stable locators.** Amtrak's own `amt-auto-test-id` attributes first, then ARIA roles. Always filtered to visible, because the form is rendered twice (desktop and mobile layouts).

**Reliability against a live site**
- The page counts as ready once its station data has loaded, not just when it's visible.
- The cookie banner is dismissed once, in a setup step.
- There are no fixed waits: the three unavoidable timings are named in `playwright.config.ts`, and lint forbids any others.

**Spec-driven.** Every behaviour is a requirement with an ID in [`specs/find-trains/`](specs/README.md), and every test is tagged with the ID it verifies. `npm run spec:coverage` (run in CI and before each commit) fails when tests and specs drift apart.

## What is tested and why

The form's job is to turn input into a correct search and to refuse input that can't be searched. The tests cover both, plus the edge cases most likely to break. Spec files and test files match one-to-one (`specs/find-trains/stations.md` ↔ `tests/find-trains/stations.spec.ts`).

| Area | Positive / edge cases | Negative cases |
|---|---|---|
| [Submission](specs/find-trains/submission.md) | One-way, round-trip, all traveler types, departing today, swapped route, traveler-party matrix, Use Points. Each checks the exact request | – |
| [Stations](specs/find-trains/stations.md) | Suggestions, exact code, lowercase, keyboard, swap; slow lookup shows "Loading" (mocked) | Unknown station, HTML injection, same From and To; lookup failure falls back to a built-in list (mocked) |
| [Dates](specs/find-trains/dates.md) | Today, months ahead, round-trip range, same-day return, 11-month horizon, typed date, month and year boundaries | Past dates, previous month, return before departure, closed calendar, invalid / past / too-far typed dates |
| [Travelers](specs/find-trains/travelers.md) | Default, total, Reset, 8 allowed, "Traveling Alone?" policy | 9+ travelers, no adult, minors alone, counter floor |
| [Trip type](specs/find-trains/trip-type.md) | One-way default, round-trip back to one-way, Multi-City legs, Group Travel page | – |
| [Required fields](specs/find-trains/required-fields.md) | Assistance needed opens the accessibility dialog first | Empty form, From only, missing To, missing date, round trip without return; each also checks no request is sent |
| [Coupons](specs/find-trains/coupons.md) | – | Letters and digits only, max 14 |
| [Accessibility](specs/find-trains/accessibility.md), [Visual](specs/find-trains/visual.md) | Travelers panel matches its approved screenshot | No new WCAG violations in the form, suggestions, calendar and travelers panel |

**Coverage:** 56 of 58 in-scope requirements have tests, one of them a known-bug repro. Two gaps are left open on purpose: STN-10 (popular stations on focus) and CPN-02 (invalid-coupon feedback). Out-of-scope items are listed with reasons in the spec files.

## Findings on amtrak.com

Writing the tests surfaced real issues. Full bug reports, with steps and evidence, are in **[`docs/findings.md`](docs/findings.md)**.

| # | Finding | Severity |
|---|---|---|
| F-01 | Clicking Swap quickly shows the same station in both fields, while a different route is searched | Medium |
| F-02 | Focus jumps back to a station field after it's picked, so a typed date landed in To ("WAS/2026") | Medium |
| F-03 | Travelers panel: the five count inputs have no labels (critical WCAG) | High (a11y) |
| F-04 | Booking form: 2 critical and 3 serious WCAG violation types at rest | High (a11y) |
| F-05 – F-09 | Copy and UX issues: adult age 16+ vs 18, date format hint, silent rejection of invalid input, fallback station order, Enter triggering "Nearby" | Low |

## Assumptions

- **Production is the target.** There's no staging access, so the suite runs read-only and never completes a search.
- **The search request is the observable result of FIND TRAINS.** Under automation the API answers 403 (bot protection) and the page shows an error banner, which is expected.
- **Browsers:** desktop Chromium (1440×900) runs everything and gates PRs. Firefox, WebKit and mobile Chrome run the `@smoke` subset nightly.
- **Data:** station codes and labels (NYP, WAS, BOS, CHI, PHL) are stable; "today" follows `America/New_York`.
- **Cookies:** the banner is dismissed with "Reject All", as a privacy-minded user would.

## With more time

- **Staging and test accounts:** end-to-end searches past the 403, signed-in "Use Points", and a real coupon to pin down CPN-02.
- **Schema contract for the search request** (e.g. zod), so an API change fails with a precise diff.
- **Close the open gaps** STN-10 and CPN-02.
- **Performance budget:** Web Vitals / Lighthouse on `/home`, tracked over time.
- **Scale-out:** sharding, and running only the tests affected by a change, once more pages are covered.
- **Report the findings** to Amtrak ([`docs/findings.md`](docs/findings.md) is ready).

---

More: [`docs/FRAMEWORK.md`](docs/FRAMEWORK.md) (commands, CI, AI debugging, structure) · [`.claude/CLAUDE.md`](.claude/CLAUDE.md) (guide for AI assistants; `AGENTS.md` links to it)
