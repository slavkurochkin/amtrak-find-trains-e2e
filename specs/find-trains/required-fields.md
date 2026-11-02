# Required fields – what blocks a search

FIND TRAINS is `aria-disabled` until the form is valid, and clicking it then sends nothing.
Tests: `tests/find-trains/form-validation.spec.ts`

### REQ-01 · Empty form can't be submitted
**Status:** automated · **Type:** negative
**Then** FIND TRAINS is disabled and clicking it sends no search.

### REQ-02 · From alone is not enough
**Status:** automated · **Type:** negative
**Given** only From is set **Then** FIND TRAINS is disabled and clicking it sends no search.

### REQ-03 · Missing To blocks the search
**Status:** automated · **Type:** negative
**Given** From and a depart date, no To **Then** FIND TRAINS is disabled and clicking it sends no search.

### REQ-04 · Missing depart date blocks the search
**Status:** automated · **Type:** negative
**Given** From and To, no date **Then** FIND TRAINS is disabled and clicking it sends no search.

### REQ-06 · Assistance needed: FIND TRAINS asks for accessibility details first
**Status:** automated · **Type:** edge
**Given** a valid search with "Passenger with Disability or Assistance Needed?" checked **When** FIND TRAINS is clicked
**Then** the "Accessible Travel Services" dialog opens (traveler name, disability or assistance type) and no search is sent yet.

### REQ-05 · Round trip without a return date blocks the search
**Status:** automated · **Type:** negative
**Given** Round-Trip with stations and a depart date only **Then** the calendar's Done is disabled; after closing it the return is empty, FIND TRAINS is disabled and clicking it sends no search.
