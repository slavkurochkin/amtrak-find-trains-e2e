# Stations – From / To fields

Autocomplete station search, selection, swap.
Tests: `tests/find-trains/stations.spec.ts`

### STN-01 · Typing a city name suggests matching stations
**Status:** automated · **Type:** positive
**Given** an empty From field **When** the user types "Washington"
**Then** suggestions are grouped (Stations, then Locations), the best station match "Washington, DC - Union Station (WAS)" is first, and several Washington matches are listed.

### STN-02 · Typing an exact station code selects it
**Status:** automated · **Type:** positive
**Given** an empty To field **When** the user types "BOS"
**Then** Boston South Station is selected without picking from the list; the field shows the chip "BOS Boston, MA South Station".

### STN-03 · Station codes match case-insensitively
**Status:** automated · **Type:** edge
**When** the user types "nyp" **Then** the first suggestion is New York Penn (NYP).

### STN-04 · A suggestion can be chosen with the keyboard
**Status:** automated · **Type:** positive
**When** the user types "Philadelphia", presses ArrowDown until PHL has focus, then Enter **Then** PHL is selected.
Note: the first ArrowDown keeps focus on the input; Enter on the input triggers the "Nearby" geolocation lookup.

### STN-05 · Swap exchanges From and To
**Status:** automated · **Type:** positive
**Given** NYP → CHI **When** the user clicks Swap **Then** the fields show CHI → NYP.

### STN-06 · Unknown station is not accepted
**Status:** automated · **Type:** negative
**Given** the station search answers "no matches" (Amtrak's real reply, replayed so the test doesn't depend on the service being up) **When** the user types "Zzqxj" **Then** the list shows "No stations found." with no options; on blur "Enter a valid station" is shown, the text stays unconverted and FIND TRAINS stays disabled.

### STN-07 · HTML/script-like input is treated as text
**Status:** automated · **Type:** negative
**When** the user enters `<img src=x id=injected onerror=alert(1)>` **Then** no script runs (no dialog), nothing is injected into the DOM, the input keeps the literal text, no station is offered and search stays disabled.
Note: the autocomplete API answers such queries with 403 (firewall) and the list goes blank without a message (finding).

### STN-08 · Same station for From and To is rejected
**Status:** automated · **Type:** negative
**Given** From is NYP **When** the user picks NYP as To
**Then** "Enter different origin and destination stations." is shown, FIND TRAINS stays disabled and no search is sent.

### STN-09 · Swapping right after picking To keeps both fields correct
**Status:** known-bug · **Type:** edge
**Given** NYP → CHI where CHI was just picked **When** Swap is clicked within ~300 ms
**Then** the fields should show CHI → NYP.
**Actual:** both show CHI while the search uses CHI → NYP. Evidence: `docs/evidence/bug-swap-race-ui-shows-CHI-CHI.png`. Run: `npm run test:known-bugs`.

### STN-10 · Focusing an empty From field shows popular stations
**Status:** gap · **Type:** positive
**When** the user focuses an empty From field **Then** "Top depart stations" with a "Nearby" option and popular stations (NYP, WAS, CHI, PHL…) is shown; after From is set, focusing To shows "Top destinations from <From>".
Low priority: the list content is editorial and changes over time; test the panel and heading, not the stations.

### STN-11 · Keystrokes go to the field the user is typing in
**Status:** out-of-scope · **Type:** edge
**Expected:** typed characters always land in the focused field.
**Observed (finding):** focus jumps around the station fields asynchronously. After a click it sometimes moves to the suggestion header, so the first keys are lost (typing "BOS" searched "OS"). Shortly after a station is picked it moves back to that station field, so keys typed next land there: a date typed into Depart Date ended up as "WAS/2026" in To (`docs/evidence/bug-focus-jump-date-typed-into-to-field.png`). Earlier "NYPshington" in From was the same bug.
Timing-dependent (more frequent under load), so not a reliable regression test; the page objects verify every entry and tests type dates before picking stations.

### STN-13 · Station search keeps working when the location service fails (mocked)
**Status:** automated · **Type:** negative
**Given** the location lookup (`/AutoCompleterArcgis/`) returns 500 **When** the user searches "Boston"
**Then** after its retries the app falls back to its built-in list: South Station (BOS), Back Bay (BBY), North Station (BON) and "Let me enter a station." are offered, and BOS can still be selected.
Note: in the fallback Back Bay is listed before South Station, so the best match is no longer first (minor finding).

### STN-14 · A slow location lookup shows "Loading" until results arrive (mocked)
**Status:** automated · **Type:** edge
**Given** the location lookup is held back **When** the user searches "Boston" **Then** the list shows "Loading"; once the response is released, the station results replace it.

### STN-15 · The station list the page loads contains the stations the suite relies on
**Status:** automated · **Type:** positive
**When** the home page loads its station list (`/services/data.stations.json`) **Then** it contains hundreds of stations, each with a code and a name, and NYP, WAS, BOS, CHI and PHL are present with the same names the form shows (e.g. NYP is "New York, NY").
Checked from the reply the page itself receives; no extra calls are made to Amtrak.

### STN-16 · The station search reply and the dropdown agree
**Status:** automated · **Type:** positive
**When** the user types "Washington" **Then** the station-search reply (`/AutoCompleterArcgis/`) ranks Washington Union Station (WAS) first, and every entry in the reply appears in the dropdown, with the first one at the top.

### STN-12 · "Nearby" uses the browser location
**Status:** out-of-scope · **Type:** positive
Needs geolocation permission and a mocked location; not part of the core search.
