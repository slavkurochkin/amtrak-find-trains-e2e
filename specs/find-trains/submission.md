# Submission – FIND TRAINS sends the right search

Scope boundary: clicking FIND TRAINS sends `POST /dotcom/journey-solution-option`. The request body is the observable result; the results page is out of scope.
Tests: `tests/find-trains/search-submission.spec.ts`

### SUB-01 · One-way search sends stations and date
**Status:** automated · **Type:** positive
**Given** From NYP, To WAS, a depart date and 1 adult **When** the user clicks FIND TRAINS
**Then** one request is sent with `type: "OW"`, one leg NYP → WAS on that date, and one adult passenger.

### SUB-02 · Round-trip search sends outbound and return legs
**Status:** automated · **Type:** positive
**Given** a round trip BOS ⇄ PHL with depart and return dates **When** FIND TRAINS is clicked
**Then** the request has `type: "RT"` and two legs: BOS → PHL on the depart date and PHL → BOS on the return date.

### SUB-03 · Every traveler type is sent as a passenger
**Status:** automated · **Type:** positive
**Given** 2 adults, 1 senior, 1 youth, 1 child, 1 infant **When** FIND TRAINS is clicked
**Then** the request has 6 passengers with those types (the API names seniors `"seniors"`).

### SUB-04 · Departure today is allowed
**Status:** automated · **Type:** edge
**Given** today's date as the depart date **When** FIND TRAINS is clicked
**Then** the search is sent with today's date.

### SUB-05 · Swapped stations are sent in swapped order
**Status:** automated · **Type:** positive
**Given** NYP → BOS swapped to BOS → NYP **When** FIND TRAINS is clicked
**Then** the request leg is BOS → NYP.

### SUB-07 · Valid traveler mixes are sent as passengers (matrix)
**Status:** automated · **Type:** edge
**Given** each valid mix: 1 senior alone (seniors count as adults), 1 senior + 1 child, 1 adult + 2 infants, 1 adult + 7 children (8 total) **When** FIND TRAINS is clicked
**Then** the request has exactly those passengers by type.

### SUB-08 · "Use Points" searches in points
**Status:** automated · **Type:** positive
**Given** a valid search **When** the user turns on Use Points and clicks FIND TRAINS **Then** the request asks for `pricingUnit: "POINTS"` instead of `"DOLLARS"`.

### SUB-06 · Results page and booking flow
**Status:** out-of-scope · **Type:** positive
Out of scope (the suite stops at the FIND TRAINS click); also blocked by bot protection (403) under automation.
