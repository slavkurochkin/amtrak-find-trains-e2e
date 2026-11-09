import { production } from './production';
import { qa } from './qa';
import type { Environment } from './types';

export type { Environment } from './types';

const ENVIRONMENTS: Record<string, Environment> = { production, qa };

/**
 * The environment under test, chosen by `TEST_ENV` (default: production).
 * To add one, create a file next to production.ts and list it above.
 */
export const environment: Environment = select(process.env.TEST_ENV || 'production');

function select(name: string): Environment {
  const env = ENVIRONMENTS[name];
  if (!env) {
    throw new Error(`Unknown TEST_ENV "${name}". Known: ${Object.keys(ENVIRONMENTS).join(', ')}.`);
  }
  return env;
}

/** The site's address: `BASE_URL` if set, otherwise the environment's own. */
export function baseURL(): string {
  const url = process.env.BASE_URL || environment.baseURL;
  if (!url) {
    throw new Error(`TEST_ENV=${environment.name} has no address: set BASE_URL (or QA_BASE_URL for qa).`);
  }
  return url;
}
