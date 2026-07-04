import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { evaluateCommandExecution } from '@wac/permission';
import type { GuardrailViolation, ShellCommandResult, ShellCommandSafety } from '@wac/shared';

export interface ShellRunnerOptions {
  workspaceRoot: string;
  maxOutputBytes?: number;
  defaultTimeoutMs?: number;
  maxTimeoutMs?: number;
}

export interface RunShellCommandInput {
  sessionId?: string;
  command: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const FORBIDDEN_TOKENS = new Set(['|', '||', '&', '&&', ';', '>', '>>', '<', '`']);
const SAFE_COMMANDS = new Set([
  'npm --version',
  'npm run typecheck',
  'npm run build',
  'node --version',
  'tsc --noEmit',
]);
const RISKY_COMMANDS = new Set(['npm install', 'git status']);

export class ShellRunner {
  readonly workspaceRoot: string;
  private readonly maxOutputBytes: number;
  private readonly defaultTimeoutMs: number;
  private readonly maxTimeoutMs: number;

  constructor(options: ShellRunnerOptions) {
    this.workspaceRoot = resolve(options.workspaceRoot);
    this.maxOutputBytes = options.maxOutputBytes ?? MAX_OUTPUT_BYTES;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxTimeoutMs = options.maxTimeoutMs ?? MAX_TIMEOUT_MS;
  }

  async run(input: RunShellCommandInput): Promise<ShellCommandResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    const parsed = parseCommand(input.command);
    const timeoutMs = clampTimeout(input.timeoutMs, this.defaultTimeoutMs, this.maxTimeoutMs);
    const violations = validateCommand(parsed.argv, this.workspaceRoot);
    const safety = classifyCommand(parsed.argv, violations);
    const decision = evaluateCommandExecution(safety, violations);

    if (!parsed.ok || decision.effect !== 'allow') {
      const finishedAt = new Date().toISOString();
      return {
        id: randomUUID(),
        sessionId: input.sessionId,
        command: input.command,
        argv: parsed.argv,
        cwd: this.workspaceRoot,
        safety,
        status: 'blocked',
        stdout: '',
        stderr: parsed.error ?? decision.reason,
        timedOut: false,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startMs,
        decision,
      };
    }

    return runProcess({
      id: randomUUID(),
      sessionId: input.sessionId,
      command: input.command,
      argv: parsed.argv,
      cwd: this.workspaceRoot,
      safety,
      startedAt,
      startMs,
      timeoutMs,
      maxOutputBytes: this.maxOutputBytes,
      decision,
    });
  }
}

interface ParsedCommand {
  ok: boolean;
  argv: string[];
  error?: string;
}

interface RunProcessInput {
  id: string;
  sessionId?: string;
  command: string;
  argv: string[];
  cwd: string;
  safety: ShellCommandSafety;
  startedAt: string;
  startMs: number;
  timeoutMs: number;
  maxOutputBytes: number;
  decision: ShellCommandResult['decision'];
}

function parseCommand(command: string): ParsedCommand {
  const argv: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index] ?? '';
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        argv.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (quote) return { ok: false, argv, error: 'Unclosed quote in command.' };
  if (current) argv.push(current);
  if (argv.length === 0) return { ok: false, argv, error: 'Command is required.' };
  if (argv.some((token) => FORBIDDEN_TOKENS.has(token) || token.includes('$('))) {
    return { ok: false, argv, error: 'Shell operators are not allowed in Phase 8.' };
  }
  return { ok: true, argv };
}

function validateCommand(argv: string[], workspaceRoot: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  for (const token of argv) {
    if (FORBIDDEN_TOKENS.has(token) || token.includes('$(')) {
      violations.push({
        code: 'shell_operator',
        message: `Shell operator is blocked: ${token}`,
      });
    }
  }
  const cwdRel = relative(workspaceRoot, workspaceRoot);
  if (cwdRel.startsWith('..')) {
    violations.push({
      code: 'cwd_escape',
      message: 'Command cwd must stay inside the workspace.',
    });
  }
  return violations;
}

function classifyCommand(argv: string[], violations: GuardrailViolation[]): ShellCommandSafety {
  if (violations.length > 0 || argv.length === 0) return 'forbidden';
  const signature = argv.join(' ');
  if (SAFE_COMMANDS.has(signature)) return 'safe';
  if (RISKY_COMMANDS.has(signature)) return 'risky';
  return 'forbidden';
}

function clampTimeout(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(250, Math.min(Math.trunc(value), max));
}

function runProcess(input: RunProcessInput): Promise<ShellCommandResult> {
  return new Promise((resolve) => {
    const child = spawn(input.argv[0] ?? '', input.argv.slice(1), {
      cwd: input.cwd,
      env: process.env,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, input.timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = appendLimited(stdout, chunk.toString('utf8'), input.maxOutputBytes);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendLimited(stderr, chunk.toString('utf8'), input.maxOutputBytes);
    });
    child.on('error', (err) => {
      stderr = appendLimited(stderr, err.message, input.maxOutputBytes);
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timeout);
      const finishedAt = new Date().toISOString();
      resolve({
        id: input.id,
        sessionId: input.sessionId,
        command: input.command,
        argv: input.argv,
        cwd: input.cwd,
        safety: input.safety,
        status: timedOut ? 'timed_out' : exitCode === 0 ? 'completed' : 'failed',
        exitCode: exitCode ?? undefined,
        signal: signal ?? undefined,
        stdout,
        stderr,
        timedOut,
        startedAt: input.startedAt,
        finishedAt,
        durationMs: Date.now() - input.startMs,
        decision: input.decision,
      });
    });
  });
}

function appendLimited(current: string, next: string, maxBytes: number): string {
  const combined = current + next;
  if (Buffer.byteLength(combined, 'utf8') <= maxBytes) return combined;
  return `${combined.slice(-maxBytes)}\n[output truncated]\n`;
}
