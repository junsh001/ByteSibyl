import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { ShellRunner } from '@wac/shell-runner';
import type { EvalReport, EvalTask, EvalTaskResult, ShellCommandResult } from '@wac/shared';

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.cache']);

export async function runEvalTasks(tasks: EvalTask[], options: { rootDir: string }): Promise<EvalReport> {
  const results: EvalTaskResult[] = [];
  const startedAt = Date.now();
  for (const task of tasks) {
    results.push(await runEvalTask(task, options));
  }
  const runtimeSeconds = secondsSince(startedAt);
  const passedCount = results.filter((result) => result.passed).length;
  const totals = results.reduce(
    (acc, result) => ({
      changedFilesCount: acc.changedFilesCount + result.changedFilesCount,
      commandCount: acc.commandCount + result.commandCount,
      toolCallCount: acc.toolCallCount + result.toolCallCount,
      approvalCount: acc.approvalCount + result.approvalCount,
      forbiddenActionCount: acc.forbiddenActionCount + result.forbiddenActionCount,
    }),
    {
      changedFilesCount: 0,
      commandCount: 0,
      toolCallCount: 0,
      approvalCount: 0,
      forbiddenActionCount: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    taskCount: tasks.length,
    passedCount,
    metrics: {
      success_rate: tasks.length === 0 ? 0 : passedCount / tasks.length,
      changed_files_count: totals.changedFilesCount,
      command_count: totals.commandCount,
      tool_call_count: totals.toolCallCount,
      approval_count: totals.approvalCount,
      runtime_seconds: runtimeSeconds,
      forbidden_action_count: totals.forbiddenActionCount,
    },
    results,
  };
}

export async function loadEvalTasks(tasksDir: string): Promise<EvalTask[]> {
  const entries = await readdir(tasksDir, { withFileTypes: true });
  const tasks: EvalTask[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const raw = await readFile(resolve(tasksDir, entry.name), 'utf8');
    tasks.push(parseEvalTask(JSON.parse(raw)));
  }
  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}

export async function runEvalTask(
  task: EvalTask,
  options: { rootDir: string },
): Promise<EvalTaskResult> {
  const startedAt = Date.now();
  const workspaceRoot = resolve(options.rootDir, task.workspace);
  const before = await snapshotWorkspace(workspaceRoot);
  const runner = new ShellRunner({ workspaceRoot, defaultTimeoutMs: 15_000 });
  const commandResults: ShellCommandResult[] = [];
  const errors: string[] = [];

  for (const command of task.successCommands) {
    const result = await runner.run({ command, timeoutMs: 15_000 });
    commandResults.push(result);
    if (result.status !== 'completed' || result.exitCode !== 0) {
      errors.push(`Command failed: ${command} (${result.status}, exit=${result.exitCode ?? 'n/a'})`);
    }
  }

  const after = await snapshotWorkspace(workspaceRoot);
  const changedFiles = diffSnapshots(before, after);
  const forbiddenFilesModified = task.forbiddenFiles.filter((path) => changedFiles.includes(normalizePath(path)));
  if (changedFiles.length > task.maxChangedFiles) {
    errors.push(`Changed files exceeded limit: ${changedFiles.length}/${task.maxChangedFiles}`);
  }
  if (forbiddenFilesModified.length > 0) {
    errors.push(`Forbidden files modified: ${forbiddenFilesModified.join(', ')}`);
  }

  return {
    id: task.id,
    passed: errors.length === 0,
    successRate: errors.length === 0 ? 1 : 0,
    changedFilesCount: changedFiles.length,
    commandCount: commandResults.length,
    toolCallCount: 0,
    approvalCount: 0,
    runtimeSeconds: secondsSince(startedAt),
    forbiddenActionCount: forbiddenFilesModified.length,
    forbiddenFilesModified,
    commandResults: commandResults.map((result) => ({
      command: result.command,
      status: result.status,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
    })),
    errors,
  };
}

export function parseEvalTask(value: unknown): EvalTask {
  if (!isRecord(value)) throw new Error('Eval task must be an object.');
  const task = {
    id: readString(value, 'id'),
    workspace: readString(value, 'workspace'),
    prompt: readString(value, 'prompt'),
    successCommands: readStringArray(value, 'successCommands'),
    forbiddenFiles: readStringArray(value, 'forbiddenFiles'),
    maxChangedFiles: readNumber(value, 'maxChangedFiles'),
  };
  if (task.successCommands.length === 0) {
    throw new Error(`Eval task ${task.id} must define at least one success command.`);
  }
  return task;
}

async function snapshotWorkspace(root: string): Promise<Map<string, string>> {
  const snapshot = new Map<string, string>();
  await snapshotDir(root, root, snapshot);
  return snapshot;
}

async function snapshotDir(root: string, current: string, snapshot: Map<string, string>): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const absolute = resolve(current, entry.name);
    if (entry.isDirectory()) {
      await snapshotDir(root, absolute, snapshot);
      continue;
    }
    if (!entry.isFile()) continue;
    const content = await readFile(absolute);
    snapshot.set(normalizePath(relative(root, absolute)), hash(content));
  }
}

function diffSnapshots(before: Map<string, string>, after: Map<string, string>): string[] {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((path) => before.get(path) !== after.get(path)).sort();
}

function hash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function secondsSince(startedAt: number): number {
  return Number(((Date.now() - startedAt) / 1000).toFixed(3));
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '');
}

function readString(value: Record<string, unknown>, key: string): string {
  const raw = value[key];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error(`Eval task field ${key} must be a non-empty string.`);
  }
  return raw;
}

function readStringArray(value: Record<string, unknown>, key: string): string[] {
  const raw = value[key];
  if (!Array.isArray(raw) || raw.some((item) => typeof item !== 'string')) {
    throw new Error(`Eval task field ${key} must be a string array.`);
  }
  return raw;
}

function readNumber(value: Record<string, unknown>, key: string): number {
  const raw = value[key];
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
    throw new Error(`Eval task field ${key} must be a non-negative number.`);
  }
  return Math.trunc(raw);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
