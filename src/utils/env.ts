import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads the optional `.env` file in the repo root (copy `.env.example`).
 * Variables already set in the shell win over the file.
 *
 * Imported first in playwright.config.ts: other modules read `process.env`
 * as soon as they load (e.g. `TEST_TZ` in dates.ts). Test workers inherit
 * the loaded values from the main process.
 */
const ENV_FILE = path.join(__dirname, '..', '..', '.env');

if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
