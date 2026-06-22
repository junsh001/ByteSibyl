import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import type { DeepSeekConfig } from '@wac/agent';

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

const apiKey = process.env.deepseek_KEY ?? process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error(
    '\n[config] No DeepSeek API key found. Set `deepseek_KEY` (or DEEPSEEK_API_KEY) in your environment or .env file.\n',
  );
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  workspaceRoot: fromRoot(process.env.WORKSPACE_ROOT ?? './workspaces'),
  databaseUrl: fromRoot(process.env.DATABASE_URL ?? './data/app.db'),
  contentDir: fromRoot(process.env.CONTENT_DIR ?? './content'),
  webDist: fromRoot(process.env.WEB_DIST ?? './apps/web/dist'),
  sandbox: {
    timeoutMs: Number(process.env.SANDBOX_TIMEOUT_MS ?? 20000),
    maxOutputBytes: Number(process.env.SANDBOX_MAX_OUTPUT_BYTES ?? 200000),
  },
  deepseek: {
    apiKey: apiKey ?? '',
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    reasonerModel: process.env.DEEPSEEK_REASONER_MODEL ?? 'deepseek-reasoner',
  } satisfies DeepSeekConfig,
};

export type AppConfig = typeof config;
