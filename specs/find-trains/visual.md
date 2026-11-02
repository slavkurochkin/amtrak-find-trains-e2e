# Visual – approved screenshots

Screenshot comparisons of form states with static content. Baselines are per OS; Linux ones are generated in the Playwright Docker image CI runs in.
Tests: `tests/find-trains/visual.spec.ts`

### VIS-01 · The travelers panel looks as approved
**Status:** automated · **Type:** positive
**When** the travelers panel is open with the default traveler **Then** it matches the approved screenshot (per OS; Linux baselines are generated in the Playwright Docker image that CI uses).
