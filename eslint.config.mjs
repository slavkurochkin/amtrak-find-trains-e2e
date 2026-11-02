import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['node_modules/', 'reports/', 'test-results/', '.auth/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs'],
    // Scripts run in Node; inspect-form.mjs also passes callbacks to page.evaluate (browser).
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      // `searchSpy: _spy` in fixtures declares a dependency without using it.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Spec files: Playwright's recommended rules, with our conventions as errors.
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error', // waits belong in config options (src/utils/timing.ts)
      'playwright/missing-playwright-await': 'error',
      'playwright/no-skipped-test': ['error', { allowConditional: true }], // e.g. skip DATE-05 on the 1st of a month
      'playwright/no-force-option': 'off', // force clicks are documented in page objects (floating label, aria-disabled button)
      // Page-object helpers like form.expectSearchDisabled() and expectRequestToMatch() are assertions.
      'playwright/expect-expect': [
        'error',
        { assertFunctionPatterns: ['^expect', '\\.expect', 'expectRequestToMatch'] },
      ],
    },
  },
  {
    // Page objects: same await / wait rules (the two named timing waits are allowed explicitly).
    files: ['src/**/*.ts'],
    plugins: { playwright },
    rules: {
      'playwright/missing-playwright-await': 'error',
      'playwright/no-wait-for-timeout': 'error',
    },
  },
);
