# Accessibility – WCAG checks on the form's states

Automated WCAG 2.1 A/AA checks with axe-core on the form and each open state.
Tests: `tests/find-trains/accessibility.spec.ts`

Known violations (a baseline in `src/data/a11yBaseline.ts`) are findings reported to Amtrak. Tests fail on any **new** violation; when Amtrak fixes a known one, the test notes it so the baseline can be tightened.

### A11Y-01 · Form at rest has no new WCAG violations
**Status:** automated · **Type:** negative
**When** the page loads **Then** axe finds no violations in the booking form beyond the baseline: `aria-allowed-attr` (dropdown buttons), `aria-required-children` (trip tabs), `color-contrast` (field labels), `label-content-name-mismatch` (travelers button), `nested-interactive` (Use Points switch).

### A11Y-02 · Station suggestions have no new WCAG violations
**Status:** automated · **Type:** negative
**When** the From suggestions are open **Then** no violations beyond the baseline: `aria-required-children` (the listbox wraps options in group headers without `role=group`).

### A11Y-03 · The calendar has no WCAG violations
**Status:** automated · **Type:** negative
**When** the Depart Date calendar is open **Then** axe finds no violations at all.

### A11Y-04 · The travelers panel has no new WCAG violations
**Status:** automated · **Type:** negative
**When** the travelers panel is open **Then** no violations beyond the baseline: `label` (critical: the five traveler-count inputs have no label, so screen readers can't tell them apart), `aria-allowed-attr` (discount dropdown), `aria-hidden-focus` (focus-trap anchors), `label-content-name-mismatch` (travelers button).
