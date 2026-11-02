/**
 * Known WCAG violations on amtrak.com (axe-core rule ids), per form state.
 * Found on 2026-11-02 and reported as findings (README "Findings", specs/find-trains/accessibility.md).
 * Tests fail on anything NOT listed here; remove an entry once Amtrak fixes it.
 */
export const A11Y_BASELINE = {
  formAtRest: [
    'aria-allowed-attr', // critical: aria-haspopup="listbox" etc. on dropdown buttons
    'aria-required-children', // critical: trip-type tablist without proper tab children
    'color-contrast', // serious: grey field labels (From, To, Depart Date)
    'label-content-name-mismatch', // serious: "1 Traveler" button's name doesn't contain its visible text
    'nested-interactive', // serious: Use Points switch nested in another control
  ],
  stationSuggestions: [
    'aria-required-children', // critical: listbox contains group headers, not only options
  ],
  calendar: [],
  travelersPanel: [
    'label', // critical: the five traveler-count inputs have no label
    'aria-allowed-attr', // critical: aria-haspopup="menu" on the discount dropdown button
    'aria-hidden-focus', // serious: focus-trap anchors are aria-hidden but focusable
    'label-content-name-mismatch', // serious: "1 Traveler" button name vs visible text
  ],
} as const satisfies Record<string, readonly string[]>;
