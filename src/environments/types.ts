import type { MessageKey } from '../data/messages';
import type { Station, StationKey } from '../data/stations';

/**
 * Everything that changes between environments (production, QA, ...).
 * Tests never read this directly: they keep using `Stations.NEW_YORK`,
 * `Messages.SAME_STATIONS`, etc., which pick up the overrides below.
 */
export interface Environment {
  name: string;
  /** The site's address. `BASE_URL` in the shell or .env wins over it. */
  baseURL?: string;
  /** Tests that don't apply here, matched against title and tags, e.g. /@VIS-/. */
  skip?: RegExp[];
  /** Test data that differs from production. Anything not listed uses production's value. */
  data?: {
    stations?: Partial<Record<StationKey, Station>>;
    messages?: Partial<Record<MessageKey, string | RegExp>>;
  };
}
