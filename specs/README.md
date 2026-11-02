# Specs – the source of truth for what we test

Tests here are **spec-driven**: every behaviour of the "Find trains" form is written down first as a requirement with an ID, and every test points back to the requirement(s) it verifies.

```
specs/find-trains/
  submission.md       SUB-*   FIND TRAINS sends the right search
  stations.md         STN-*   From / To autocomplete, swap
  dates.md            DATE-*  calendar, typed dates, booking horizon
  travelers.md        TRAV-*  traveler counts and rules
  trip-type.md        TRIP-*  One-Way / Round-Trip / Multi-City
  required-fields.md  REQ-*   what blocks a search
```

## Requirement format

```md
### STN-08 · Same station for From and To is rejected
**Status:** automated · **Type:** negative
**Given** From is NYP **When** the user picks NYP as To
**Then** "Enter different origin and destination stations." is shown, FIND TRAINS stays disabled and no search is sent.
```

- **ID** `AREA-NN`: never reused or renumbered. Retire a requirement by marking it `out-of-scope` with a reason.
- **Status:**
  - `automated`: at least one test is tagged with the ID
  - `gap`: should be tested, isn't yet
  - `known-bug`: the site violates it; a `@known-bug` test reproduces it
  - `out-of-scope`: deliberately not tested (the reason is on the next line)
- **Type:** `positive`, `negative` or `edge`.
- Given / When / Then describes observable behaviour (UI or search request), not implementation.

## Linking tests to specs

Tag each test with the IDs it verifies:

```ts
test('the same station for From and To is rejected', { tag: ['@negative', '@STN-08'] }, async (...) => { ... });
```

`npx playwright test --grep @STN-08` then runs exactly that requirement.

## Workflow

1. **Spec first.** Add or update the requirement (status `gap`). New behaviour discovered on the site goes here even if you won't automate it now.
2. **Test.** Write the test with the `write-find-trains-test` skill and tag it with the ID.
3. **Flip the status** to `automated` (or `known-bug`).
4. **Check:** `npm run spec:coverage`. It fails if a test has no spec ID, uses an unknown ID, or a requirement's status doesn't match its tests. It lists open gaps. CI runs it too.

The Playwright **planner** agent (`.claude/agents/playwright-test-planner.md`) explores the live page and saves raw plans here; convert them into requirements in this format before writing tests.
