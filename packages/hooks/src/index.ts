import { randomUUID } from 'node:crypto';
import type { HookPhase, HookRecord, HookStatus, ShellCommandResult, ToolResult } from '@wac/shared';

export interface HookContext {
  sessionId?: string;
  runId?: string;
}

export interface HookExecution {
  records: HookRecord[];
  blocked: boolean;
  message?: string;
}

export class HookRegistry {
  async onSessionStart(input: HookContext & { subject: string }): Promise<HookExecution> {
    return this.safeRecord({
      ...input,
      phase: 'onSessionStart',
      hookName: 'record-session-start',
      subject: input.subject,
      run: () => ({
        status: 'passed',
        message: `Session started: ${input.subject}`,
      }),
    });
  }

  async onAgentStop(
    input: HookContext & { subject: string; finishReason: string },
  ): Promise<HookExecution> {
    return this.safeRecord({
      ...input,
      phase: 'onAgentStop',
      hookName: 'record-agent-stop',
      subject: input.subject,
      run: () => ({
        status: 'passed',
        message: `Agent stopped: ${input.finishReason}`,
      }),
    });
  }

  async beforeToolCall(
    input: HookContext & { toolName: string; toolInput: unknown },
  ): Promise<HookExecution> {
    return this.safeRecord({
      ...input,
      phase: 'beforeToolCall',
      hookName: 'block-direct-mutation-tools',
      subject: input.toolName,
      run: () => {
        const forbidden = new Set(['write_file', 'apply_patch', 'execute_command', 'run_shell']);
        if (forbidden.has(input.toolName)) {
          return {
            status: 'blocked',
            message: `Tool ${input.toolName} must go through approved workspace routes.`,
          };
        }
        return { status: 'passed', message: `Tool ${input.toolName} is allowed.` };
      },
    });
  }

  async afterToolCall(input: HookContext & { result: ToolResult }): Promise<HookExecution> {
    return this.safeRecord({
      ...input,
      phase: 'afterToolCall',
      hookName: 'record-tool-outcome',
      subject: input.result.name,
      run: () => ({
        status: 'passed',
        message: input.result.ok ? 'Tool call completed.' : 'Tool call returned an error.',
        summary: input.result.error ?? summarizeText(JSON.stringify(input.result.output ?? {})),
      }),
    });
  }

  async beforeFileEdit(input: HookContext & { path: string }): Promise<HookExecution> {
    return this.safeRecord({
      ...input,
      phase: 'beforeFileEdit',
      hookName: 'block-sensitive-file-edit',
      subject: input.path,
      run: () => {
        if (isSensitivePath(input.path)) {
          return {
            status: 'blocked',
            message: `Editing sensitive file is blocked by hook: ${input.path}`,
          };
        }
        return { status: 'passed', message: `File edit allowed: ${input.path}` };
      },
    });
  }

  async afterFileEdit(input: HookContext & { path: string }): Promise<HookExecution> {
    return this.safeRecord({
      ...input,
      phase: 'afterFileEdit',
      hookName: 'record-file-edit',
      subject: input.path,
      run: () => ({
        status: 'passed',
        message: `File edit completed: ${input.path}`,
      }),
    });
  }

  async beforeCommandRun(input: HookContext & { command: string }): Promise<HookExecution> {
    return this.safeRecord({
      ...input,
      phase: 'beforeCommandRun',
      hookName: 'record-command-intent',
      subject: input.command,
      run: () => ({ status: 'passed', message: `Command will run through Shell Runner.` }),
    });
  }

  async afterCommandRun(input: HookContext & { result: ShellCommandResult }): Promise<HookExecution> {
    return this.safeRecord({
      ...input,
      phase: 'afterCommandRun',
      hookName: 'summarize-command-output',
      subject: input.result.command,
      run: () => ({
        status: 'passed',
        message: `Command finished with status ${input.result.status}.`,
        summary: summarizeCommandOutput(input.result),
      }),
    });
  }

  private async safeRecord(
    input: HookContext & {
      phase: HookPhase;
      hookName: string;
      subject: string;
      run: () => { status: HookStatus; message: string; summary?: string };
    },
  ): Promise<HookExecution> {
    try {
      const result = input.run();
      const record = createRecord(input, result.status, result.message, result.summary);
      return {
        records: [record],
        blocked: result.status === 'blocked',
        message: result.status === 'blocked' ? result.message : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        records: [createRecord(input, 'error', `Hook failed without stopping session: ${message}`)],
        blocked: false,
      };
    }
  }
}

function createRecord(
  input: HookContext & { phase: HookPhase; hookName: string; subject: string },
  status: HookStatus,
  message: string,
  summary?: string,
): HookRecord {
  return {
    id: randomUUID(),
    sessionId: input.sessionId,
    runId: input.runId,
    phase: input.phase,
    hookName: input.hookName,
    status,
    subject: input.subject,
    message,
    summary,
    createdAt: new Date().toISOString(),
  };
}

function isSensitivePath(path: string): boolean {
  const normalized = path.replaceAll('\\', '/').split('/').at(-1) ?? path;
  return normalized === '.env' || normalized.startsWith('.env.');
}

function summarizeCommandOutput(result: ShellCommandResult): string {
  const stdout = summarizeText(result.stdout);
  const stderr = summarizeText(result.stderr);
  return `stdout=${stdout || '<empty>'}; stderr=${stderr || '<empty>'}`;
}

function summarizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim().slice(0, 240);
}
