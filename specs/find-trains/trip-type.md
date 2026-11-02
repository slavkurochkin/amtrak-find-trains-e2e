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

### TRIP-03 · Multi-City search sends each leg in order
**Status:** automated · **Type:** positive
**Given** Multi-City with leg 1 NYP → PHL and leg 2 PHL → WAS on later dates **When** FIND TRAINS is clicked
**Then** the request has `type: "MC"` and two legs in that order with their dates.

### TRIP-04 · Group Travel opens the group request page
**Status:** automated · **Type:** positive
**When** the user picks Group Travel in the trip-type menu **Then** the browser goes to `/tickets/grouptravel` (the group request flow itself is out of scope).
