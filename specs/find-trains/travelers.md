# Travelers

The "N Traveler(s)" panel with +/- steppers for Adult (16+), Senior (65+), Youth (13-15), Child (2-12) and Infant (under 2).
Tests: `tests/find-trains/travelers.spec.ts`

### TRAV-01 · Defaults to one adult
**Status:** automated · **Type:** positive
**Then** the button reads "1 Traveler"; Adult is 1, all other types 0 with their "-" disabled.

### TRAV-02 · The button shows the total across types
**Status:** automated · **Type:** positive
**When** the user sets 2 adults, 1 child and 1 infant **Then** the button reads "4 Travelers".

### TRAV-03 · Reset returns to one adult
**Status:** automated · **Type:** positive
**Given** 3 adults and 2 seniors **When** the user clicks Reset **Then** Adult is 1 and Senior is 0.

### TRAV-04 · Up to 8 travelers can book online
**Status:** automated · **Type:** edge
**When** the user sets 8 adults **Then** no phone-booking message is shown and "+" stays enabled.

### TRAV-05 · More than 8 travelers must book by phone
**Status:** automated · **Type:** negative
**When** the total reaches 9 **Then** "Call 1-800-USA-RAIL to make reservations for 9 to 14 travelers…" is shown and every "+" is disabled.

### TRAV-06 · At least one adult is required
**Status:** automated · **Type:** negative
**When** the user removes the only adult **Then** "Add at least one adult 18 years old or older." is shown, Adult "-" is disabled and FIND TRAINS stays disabled.
Note: the panel labels Adult as 16+ but the message says 18 (finding).

### TRAV-07 · Minors alone can't search (matrix)
**Status:** automated · **Type:** negative
**Given** 0 adults and 0 seniors **When** the only travelers are 2 children, 1 youth, or 1 infant
**Then** "Add at least one adult…" is shown, the panel's Done button is disabled and FIND TRAINS stays disabled.

### TRAV-08 · Counters can't go below zero
**Status:** automated · **Type:** negative
**Given** Adult is 0 **When** the user clicks "-" **Then** Adult stays 0.

### TRAV-09 · "Traveling Alone?" explains the unaccompanied-youth policy
**Status:** automated · **Type:** edge
**When** the user clicks "Traveling Alone?" in the Youth row **Then** a "Traveling Alone" dialog opens with the policy. (Booking an unaccompanied minor is a separate flow, out of scope.)

### TRAV-10 · Per-traveler discounts and promo code
**Status:** out-of-scope · **Type:** positive
Discount dropdowns and promo code inside the panel affect pricing, not the search form's validity.
