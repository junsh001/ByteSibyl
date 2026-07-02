import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

// Resolve the monorepo root from this module's location so paths are stable
// regardless of the process working directory.
const HERE = dirname(fileURLToPath(import.meta.url)); // apps/server/src
const ROOT = resolve(HERE, '../../..');

// Load .env from the repo root (preferred) then fall back to cwd.
dotenv.config({ path: resolve(ROOT, '.env') });
dotenv.config();

function fromRoot(p: string): string {
  return resolve(ROOT, p);
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  webDist: fromRoot(process.env.WEB_DIST ?? './apps/web/dist'),
};

export type AppConfig = typeof config;
