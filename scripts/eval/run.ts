/**
 * Run the built-in coding benchmark against our DeepSeek-powered agent.
 *
 *   npx tsx scripts/eval/run.ts
 *
 * Prints a pass@1 scorecard. This is the number we track to claim a
 * "top-tier" position (Aider-Polyglot-style; see README benchmarking section).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAgent, Workspace } from '@wac/agent';
import { config } from '../../apps/server/src/config.js';
import { createSandboxRunner } from '../../apps/server/src/sandbox.js';
import { EVAL_TASKS, type EvalTask } from './tasks.js';

const runner = createSandboxRunner(config);
const EVAL_ROOT = join(config.workspaceRoot, '_eval');

async function runOne(task: EvalTask): Promise<{ id: string; pass: boolean; detail: string }> {
  const dir = join(EVAL_ROOT, task.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [path, content] of Object.entries(task.seed ?? {})) {
    writeFileSync(join(dir, path), content, 'utf8');
  }

  const ws = new Workspace(dir);
  // Drive the agent; we only care about the resulting files, so drain events.
  try {
    for await (const ev of runAgent(
      config.deepseek,
      { message: task.prompt, mode: 'agent' },
      { workspace: ws, runner },
    )) {
      if (ev.type === 'error') return { id: task.id, pass: false, detail: `agent error: ${ev.message}` };
    }
  } catch (err) {
    return { id: task.id, pass: false, detail: `exception: ${(err as Error).message}` };
  }

  const r = await runner.run(task.verify.command, { cwd: dir });
  const out = r.stdout + r.stderr;
  const pass = r.exitCode === 0 && out.includes(task.verify.expect);
  return {
    id: task.id,
    pass,
    detail: pass ? 'ok' : `exit ${r.exitCode}; out=${out.slice(0, 120).replace(/\n/g, '⏎')}`,
  };
}

async function main() {
  if (!config.deepseek.apiKey) {
    console.error('No API key — set deepseek_KEY.');
    process.exit(1);
  }
  console.log(`\n🧪 CodeForge agent benchmark — ${EVAL_TASKS.length} polyglot tasks (model: ${config.deepseek.model})\n`);
  const results: { id: string; pass: boolean; detail: string }[] = [];
  for (const task of EVAL_TASKS) {
    process.stdout.write(`  ▶ ${task.id.padEnd(16)} `);
    const res = await runOne(task);
    results.push(res);
    console.log(res.pass ? '✅ PASS' : `❌ FAIL  (${res.detail})`);
  }
  const passed = results.filter((r) => r.pass).length;
  const pct = ((passed / results.length) * 100).toFixed(1);
  console.log(`\n──────────────────────────────────────`);
  console.log(`  pass@1: ${passed}/${results.length}  =  ${pct}%`);
  console.log(`  Reference: Aider-Polyglot top-10 bar ≈ 80%; DeepSeek-V3.2 ≈ 74%.`);
  console.log(`──────────────────────────────────────\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
