# Trip type

The "One-Way ▾" menu: One-Way, Round-Trip, Multi-City, Group Travel.
Tests: `tests/find-trains/trip-type.spec.ts`

### TRIP-01 · One-Way is the default and asks for a depart date only
**Status:** automated · **Type:** positive
**When** the page loads **Then** the trip type is One-Way, a Depart Date field is shown and no Return Date input is shown.

### TRIP-02 · Switching from Round-Trip back to One-Way drops the return date
**Status:** automated · **Type:** edge
**Given** a filled round trip **When** the user switches to One-Way and clicks FIND TRAINS
**Then** the Return Date input disappears and a one-way search (`type: "OW"`, one leg, original depart date) is sent.

### TRIP-03 · Multi-City search
**Status:** out-of-scope · **Type:** positive
Repeatable legs ("Add Trip"); a good next component (`TripLeg`), not needed to show the approach.

### TRIP-04 · Group Travel
**Status:** out-of-scope · **Type:** positive
Leads to the group-request flow (15+ travelers), outside the Find trains form.
