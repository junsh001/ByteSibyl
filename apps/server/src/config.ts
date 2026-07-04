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

function modelProvider(): 'mock' | 'openai_compatible' {
  const raw = (process.env.MODEL_PROVIDER ?? process.env.WAC_MODEL_PROVIDER ?? 'mock')
    .trim()
    .toLowerCase();
  if (raw === 'openai' || raw === 'openai-compatible' || raw === 'deepseek') {
    return 'openai_compatible';
  }
  return 'mock';
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  workspaceRoot: fromRoot(process.env.WAC_WORKSPACE_ROOT ?? './examples/buggy-ts-project'),
  webDist: fromRoot(process.env.WEB_DIST ?? './apps/web/dist'),
  sessionLogPath: fromRoot(process.env.WAC_SESSION_LOG_PATH ?? './data/session-log.json'),
  modelProvider: modelProvider(),
  modelApiKey:
    process.env.MODEL_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.DEEPSEEK_API_KEY ??
    process.env.deepseek_KEY,
  modelBaseUrl:
    process.env.MODEL_BASE_URL ?? process.env.OPENAI_BASE_URL ?? process.env.DEEPSEEK_BASE_URL ??
    'https://api.deepseek.com',
  modelName: process.env.MODEL_NAME ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
  modelTimeoutMs: Number(process.env.MODEL_TIMEOUT_MS ?? 30_000),
  contextBudgetChars: Number(process.env.CONTEXT_BUDGET_CHARS ?? 6_000),
};

export type AppConfig = typeof config;
