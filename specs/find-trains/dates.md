# Dates – depart and return

Two-month calendar popup and the date inputs. "Today" follows the browser time zone (`America/New_York`).
Tests: `tests/find-trains/dates.spec.ts`

### DATE-01 · Calendar opens on the current month with today selectable
**Status:** automated · **Type:** positive
**When** the user opens the Depart Date calendar **Then** today's cell is enabled.

### DATE-02 · Future months are reachable with "Next month"
**Status:** automated · **Type:** positive
**When** the user navigates ~4 months ahead and picks a date **Then** the depart input shows it (format `M/D/YYYY`, no leading zeros, although the hint says `MM/DD/YYYY`).

### DATE-03 · Round trip: depart and return are picked as a range
**Status:** automated · **Type:** positive
**Given** Round-Trip **When** the user picks a depart and then a later return date and clicks Done **Then** both inputs show the chosen dates.

### DATE-04 · Round trip: same-day return is allowed
**Status:** automated · **Type:** edge
**When** the user picks the same day for depart and return **Then** both inputs show that day.

### DATE-05 · Past dates are disabled
**Status:** automated · **Type:** negative
**When** the calendar is open **Then** yesterday is `aria-disabled`. (Skipped on the 1st of a month: yesterday isn't rendered.)

### DATE-06 · Clicking a past date selects nothing
**Status:** automated · **Type:** negative
**When** the user clicks yesterday **Then** it isn't selected and the depart input stays empty.

### DATE-07 · Calendar can't go before the current month
**Status:** automated · **Type:** negative
**When** the calendar opens **Then** "Previous month" is disabled.

### DATE-08 · Round trip: a return before departure is not accepted
**Status:** automated · **Type:** negative
**Given** depart D picked **When** the user clicks a date before D
**Then** the range restarts at the earlier date, Done is disabled until a later return is picked, and the final range is earlier → later.

### DATE-09 · Closing the calendar without choosing leaves the search blocked
**Status:** automated · **Type:** negative
**When** the user opens the calendar and clicks Close **Then** the depart input is empty and FIND TRAINS stays disabled.

### DATE-10 · Bookings open 11 months ahead
**Status:** automated · **Type:** edge
**When** the user navigates to the furthest month **Then** today + 11 months is the last enabled day, the next day is disabled, and "Next month" is disabled.

### DATE-13 · Round trips across month and year boundaries (matrix)
**Status:** automated · **Type:** edge
**Given** a round trip from the last day of the current month to the 1st of the next, and from Dec 31 to Jan 1 **When** FIND TRAINS is clicked
**Then** both legs carry the right dates (`YYYY-MM-DDT00:00:00`). The New Year case is skipped while Jan 1 is beyond the 11-month horizon.

### DATE-11 · A valid date can be typed into the depart field
**Status:** automated · **Type:** positive
**Given** stations are set **When** the user focuses Depart Date with the keyboard, types a valid future date (`M/D/YYYY`) and leaves the field
**Then** the date is kept and used in the search request.
Desktop only: on mobile the field is read-only (`aria-readonly`) and opens the calendar. The test types the date before picking stations (see STN-11).

### DATE-12 · Invalid typed dates are rejected
**Status:** automated · **Type:** negative
**When** the user types an impossible date (`13/45/<year>`), a past date, or a date beyond the 11-month horizon, and leaves the field
**Then** the field is cleared (no error message is shown) and FIND TRAINS stays disabled.
