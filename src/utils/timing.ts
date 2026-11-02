import { test } from '@playwright/test';

/**
 * Suite-specific timings: the few waits that can't be expressed as "wait until X".
 * The values are set in ONE place, playwright.config.ts under `use`; everything
 * else waits on conditions, bounded by `actionTimeout` / `expect.timeout`.
 */
export interface TimingOptions {
  /** Idle time before clicking Swap (works around Amtrak's swap race bug, F-01). */
  stationSettleMs: number;
  /** How long a negative test watches to prove no search request is sent. */
  noSearchWindowMs: number;
  /** Delay between keystrokes in tests that type key by key like a user. */
  typingDelayMs: number;
}

/** Reads the timing values of the running test's project from the config. */
export function timing(): TimingOptions {
  const { stationSettleMs, noSearchWindowMs, typingDelayMs } = test.info().project.use as Partial<TimingOptions>;
  if (stationSettleMs === undefined || noSearchWindowMs === undefined || typingDelayMs === undefined) {
    throw new Error('Timing options are missing from `use` in playwright.config.ts');
  }
  return { stationSettleMs, noSearchWindowMs, typingDelayMs };
}
