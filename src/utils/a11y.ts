import { AxeBuilder } from '@axe-core/playwright';
import { test, type Page } from '@playwright/test';

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export interface A11yResult {
  /** Violations not in the baseline: these fail the test. */
  newViolations: string[];
  /** Baseline entries axe no longer reports: Amtrak fixed them, tighten the baseline. */
  fixed: string[];
}

/**
 * Runs axe (WCAG 2.1 A/AA) on part of the page and compares the result with
 * a baseline of known violations. The full axe report is attached to the test.
 */
export async function scanAccessibility(page: Page, scope: string, baseline: readonly string[]): Promise<A11yResult> {
  return test.step(`Accessibility scan: ${scope}`, async () => {
    const results = await new AxeBuilder({ page }).include(scope).withTags(WCAG_21_AA).analyze();
    await test.info().attach(`axe-${scope.replace(/\W+/g, '-')}.json`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
    const found = results.violations.map((v) => v.id);
    const newViolations = results.violations
      .filter((v) => !baseline.includes(v.id))
      .map(
        (v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length} element(s), e.g. ${v.nodes[0]?.target.join(' ')})`,
      );
    const fixed = baseline.filter((id) => !found.includes(id));
    if (fixed.length) {
      test.info().annotations.push({ type: 'a11y-fixed', description: `No longer reported: ${fixed.join(', ')}` });
    }
    return { newViolations, fixed };
  });
}
