import type { FastifyInstance } from 'fastify';
import type { HookRegistry } from '@wac/hooks';
import type { ShellRunner } from '@wac/shell-runner';
import type { ShellCommandRequest, ShellCommandResponse } from '@wac/shared';
import type { SessionStore } from '@wac/telemetry';

export async function registerShellRoutes(
  app: FastifyInstance,
  deps: {
    shellRunner: ShellRunner;
    hooks: HookRegistry;
    sessionStore: SessionStore;
  },
): Promise<void> {
  app.post('/api/shell/run', async (req, reply): Promise<ShellCommandResponse> => {
    const body = (req.body ?? {}) as Partial<ShellCommandRequest>;
    if (!body.command?.trim()) {
      return reply.code(400).send({ error: 'command is required' }) as never;
    }
    if (body.sessionId && !deps.sessionStore.getSession(body.sessionId)) {
      return reply.code(404).send({ error: 'session not found' }) as never;
    }

    const before = await deps.hooks.beforeCommandRun({
      sessionId: body.sessionId,
      command: body.command.trim(),
    });
    if (body.sessionId) await deps.sessionStore.saveHookRecords(before.records);

    const result = await deps.shellRunner.run({
      sessionId: body.sessionId,
      taskId: body.taskId,
      command: body.command.trim(),
      timeoutMs: body.timeoutMs,
    });
    const after = await deps.hooks.afterCommandRun({ sessionId: body.sessionId, result });
    if (body.sessionId) {
      await deps.sessionStore.saveCommandResult(result);
      await deps.sessionStore.saveHookRecords(after.records);
      if (body.taskId && deps.sessionStore.getTask(body.taskId)) {
        await deps.sessionStore.appendTaskMessage(body.taskId, {
          role: 'command',
          content: `命令 ${result.command} ${result.status}${result.exitCode === undefined ? '' : ` exit=${result.exitCode}`}`,
          refId: result.id,
        });
      }
    }
    return { result };
  });
}
