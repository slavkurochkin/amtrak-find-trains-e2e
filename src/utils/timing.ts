/**
 * Suite-specific timings: things that can't be expressed as "wait until X".
 * Values live in playwright.config.ts under `use` (fixture options), and can
 * be overridden per project or per file with `test.use({ stationSettleMs: 2_000 })`.
 * Everything else waits on conditions, bounded by `actionTimeout` / `expect.timeout`.
 */
export interface TimingOptions {
  /** Idle time before clicking Swap (works around Amtrak's swap race bug). */
  stationSettleMs: number;
  /** How long a negative test watches to prove no search request is sent. */
  noSearchWindowMs: number;
  /** Delay between keystrokes in tests that type key by key like a user. */
  typingDelayMs: number;
}

export const DEFAULT_TIMING: TimingOptions = {
  stationSettleMs: 1_000,
  noSearchWindowMs: 2_000,
  typingDelayMs: 80,
};
