import type { FastifyInstance } from 'fastify';
import type { ShellRunner } from '@wac/shell-runner';
import type { ShellCommandRequest, ShellCommandResponse } from '@wac/shared';
import type { SessionStore } from '@wac/telemetry';

export async function registerShellRoutes(
  app: FastifyInstance,
  deps: {
    shellRunner: ShellRunner;
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

    const result = await deps.shellRunner.run({
      sessionId: body.sessionId,
      command: body.command.trim(),
      timeoutMs: body.timeoutMs,
    });
    if (body.sessionId) {
      await deps.sessionStore.saveCommandResult(result);
    }
    return { result };
  });
}
