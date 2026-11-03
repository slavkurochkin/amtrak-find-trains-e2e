# Findings on amtrak.com – "Find trains" form

Found while building this suite, 2026-11-02, against production (https://www.amtrak.com/home).
Environment: Chromium (Playwright 1.64), 1440×900, America/New_York; mobile findings on Pixel 7 emulation.
Severity: **High** blocks or misleads a user; **Medium** wrong behaviour with a workaround; **Low** cosmetic or copy.

Each finding links to its requirement in `specs/find-trains/` and to evidence in `docs/evidence/`.

## How these were found, and our approach to Amtrak's terms

Amtrak's [Web Notices & Terms of Use](https://www.amtrak.com/planning-booking/policies/web-notices-terms-of-use) restrict using automated tools on the site (Code of Conduct: no "robot, spider, site search/retrieval application or other manual or automatic device or process to retrieve, index…"). We wanted to test the form ethically, within the spirit of those terms:

- **Normal use only.** Every finding comes from using the form the way a visitor would: typing, clicking and reading what the page shows. Nothing was scraped, harvested or stored beyond what a test needs to check one result.
- **No bypassing.** When Amtrak's bot protection blocked automated searches, we recorded it as a limitation and stopped there. We never tried to get past it, or past CAPTCHAs or rate limits.
- **No load on Amtrak's booking systems.** Every search request is stopped in the browser before it reaches Amtrak. No accounts, bookings or personal data were used.
- **Minimal traffic.** The suite runs only when someone starts it, never on a schedule.
- **Responsible reporting.** These are usability and accessibility issues, not security vulnerabilities, so sharing them openly harms no one, and they are written to help Amtrak fix them. If we had found a security issue, we would have reported it to Amtrak privately and left it out of this repository.

---

## F-01 · Swap shows the wrong route when clicked quickly — Medium
**Spec:** STN-09 (repro: `npm run test:known-bugs`)
**Steps**
1. From: type "New York", pick NYP. To: type "Chicago", pick CHI.
2. Within ~300 ms of picking CHI, click the Swap button.

**Expected:** From CHI, To NYP.
**Actual:** both fields show **CHI**. No "same station" error appears, but the search that's sent is CHI → NYP, so the user sees one route and searches another.
**Frequency:** 3/3 with no delay or a 300 ms delay; 0/2 with 800 ms or more.
**Evidence:** `bug-swap-race-ui-shows-CHI-CHI.png`

## F-02 · Typed characters land in the wrong field — Medium
**Spec:** STN-11
**Steps**
1. Pick a To station (e.g. WAS).
2. Immediately focus Depart Date and type `11/22/2026`.

**Expected:** the date appears in Depart Date.
**Actual:** focus jumps back to the To field shortly after a station is picked, and part of the date lands there: To shows **"WAS/2026"** and "Enter a valid station". In a related case, clicking a station field sometimes moves focus to the suggestion header, so the first keys are lost (typing "BOS" searched "OS").
**Frequency:** intermittent, more frequent under load.
**Evidence:** `bug-focus-jump-date-typed-into-to-field.png`

## F-03 · Traveler-count inputs have no labels (WCAG 1.3.1 / 4.1.2) — High (accessibility)
**Spec:** A11Y-04
**Steps:** open the Travelers panel; run axe-core (WCAG 2.1 A/AA).
**Actual:** critical `label` violation on the five count inputs (Adult … Infant), so a screen reader announces five unlabeled values. Same panel: `aria-allowed-attr` (critical, discount dropdown), `aria-hidden-focus` (serious, focus-trap anchors), `label-content-name-mismatch` (serious, "1 Traveler" button).
**Evidence:** axe JSON is attached to the A11Y-04 test in the HTML report.

## F-04 · Booking form WCAG violations at rest — High (accessibility)
**Spec:** A11Y-01, A11Y-02
**Actual:**
- critical `aria-allowed-attr` on the dropdown buttons;
- critical `aria-required-children` on the trip-type tabs and on the station listbox (group headers inside a `listbox`);
- serious `color-contrast` on the field labels;
- serious `label-content-name-mismatch` on the travelers button;
- serious `nested-interactive` on the Use Points switch.

The calendar has no violations.

## F-05 · Adult age is inconsistent — Low
**Spec:** TRAV-06
**Actual:** the Travelers panel labels Adult as **16+**, but removing all adults shows "Add at least one adult **18** years old or older."

## F-06 · Date hint doesn't match the displayed format — Low
**Spec:** DATE-02
**Actual:** the field hint says `MM/DD/YYYY`, but dates display as `11/6/2026` (no leading zeros).

## F-07 · Invalid input is rejected without explanation — Low
**Specs:** STN-07, DATE-12, CPN-02
- HTML-like station queries get a 403 from the lookup API; the list shows "Loading", then goes blank with no message.
- Impossible, past or too-far typed dates (`13/45/2026`, yesterday, beyond 11 months) are silently cleared on blur.
- A coupon such as `X000` keeps FIND TRAINS disabled with no message.
- When the station search service fails (seen on GitHub's servers: **503** three times for "Zzqxj") and nothing matches the built-in list, the dropdown stays blank: no "No stations found." and no error.

## F-08 · Fallback station list loses the best match — Low
**Spec:** STN-13 (mocked lookup failure)
**Actual:** when the station-lookup API fails, the app retries and falls back to a built-in list (good), but for "Boston" it lists Back Bay before South Station, so the main station is no longer first.

## F-09 · Keyboard: Enter right after typing triggers "Nearby" — Low
**Spec:** STN-04
**Actual:** in the station dropdown the first ArrowDown keeps focus on the input. Pressing Enter there starts the "Nearby" geolocation lookup ("Location blocked…" if location is denied) instead of choosing the highlighted station.

---

### Not bugs, but worth knowing
- Under automation the search API returns 403 (bot protection), and the page shows "We've experienced an unknown error". Tests stop at the request.
- On mobile the date field is read-only by design (calendar only).
