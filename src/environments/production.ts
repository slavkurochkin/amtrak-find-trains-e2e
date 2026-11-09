import type { Environment } from './types';

/** The live site. The test data in src/data/ is production's, so nothing is overridden. */
export const production: Environment = {
  name: 'production',
  baseURL: 'https://www.amtrak.com',
};
