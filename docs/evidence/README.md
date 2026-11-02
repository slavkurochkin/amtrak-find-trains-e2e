# Evidence

Captured on **2026-11-02** against production amtrak.com, Chromium headless, 1440×900, `America/New_York`.

| File | What it shows |
|---|---|
| [`test-run.log`](test-run.log) | Full PR-gate run on desktop Chromium: **65 passed** (63 requirement tests + seed + setup), ~2 min. Cross-browser `@smoke` (Firefox, WebKit, mobile Chrome): 37 passed, 2 flaky (passed on retry), 1 skipped by design |
| [`junit.xml`](junit.xml) | Same run in JUnit format |
| [`search-requests/`](search-requests/) | Request bodies captured when FIND TRAINS was clicked (one-way, round-trip, all traveler types, swapped route) |
| [`screenshots/`](screenshots/) | End-of-test screenshots of key happy and negative states (below) |
| [`bug-swap-race-ui-shows-CHI-CHI.png`](bug-swap-race-ui-shows-CHI-CHI.png) | Swap bug: both fields show CHI after swapping NYP → CHI quickly |
| [`bug-focus-jump-date-typed-into-to-field.png`](bug-focus-jump-date-typed-into-to-field.png) | Focus bug: a date typed right after picking To landed in the To field ("WAS/2026") |
| [`example-ai-failure-summary.md`](example-ai-failure-summary.md) | What the AI failure summary looks like, from a deliberately broken test (expected BOS, form sent WAS) |

## Screenshots

| # | Test | Shows |
|---|---|---|
| 01 | one-way search | Form filled NYP → WAS. The banner "We've experienced an unknown error" is expected: the test aborted the search request on purpose |
| 02 | round-trip search | BOS → PHL with both dates filled |
| 03 | same station | "Enter different origin and destination stations.", FIND TRAINS disabled |
| 04 | unknown station | "Enter a valid station" for "Zzqxj" |
| 05 | HTML injection | Payload kept as literal text, nothing rendered or executed |
| 06 | 9 travelers | "Call 1-800-USA-RAIL to make reservations for 9 to 14 travelers…", all "+" disabled |
| 07 | 0 adults | "Add at least one adult 18 years old or older." |
| 08 | return before departure | Range restarted at the earlier date and completed with a later return |
| 09 | empty form | FIND TRAINS disabled, no request sent |
| 10 | known bug | CHI → CHI after a quick swap (`npm run test:known-bugs`) |

## Sample captured request (round trip, BOS ⇄ PHL)

See [`search-requests/round-trip-BOS-PHL.json`](search-requests/round-trip-BOS-PHL.json). The test checks `type`, each leg's origin/destination code and date, and the passenger types.
