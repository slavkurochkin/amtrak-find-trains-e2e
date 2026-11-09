import type { Environment } from './types';

/**
 * A QA / staging copy of the site. Its address comes from `QA_BASE_URL`
 * (or `BASE_URL`), so it isn't written into the repo.
 *
 * Add here only what differs from production, for example:
 *   data: { stations: { BOSTON: { ...Stations.BOSTON, cityLabel: 'Boston (QA), MA' } } }
 */
export const qa: Environment = {
  name: 'qa',
  baseURL: process.env.QA_BASE_URL,
  skip: [
    // The screenshots were approved on production. Approve QA's own, then remove this.
    /@VIS-/,
  ],
};
