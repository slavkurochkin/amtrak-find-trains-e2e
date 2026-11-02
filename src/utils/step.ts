import { test } from '@playwright/test';

/**
 * Runs a page-object action as a named step. Step names show up in the HTML
 * report, traces and the AI failure summary, so a failure reads like
 * "Select To station: WAS" instead of "Click (StationField.ts:52)".
 */
export function step<T>(title: string, body: () => Promise<T>): Promise<T> {
  return test.step(title, body);
}
