import type { FastifyInstance } from 'fastify';
import type { ToolCallRequest, ToolListResponse } from '@wac/shared';
import type { ToolRunner, ToolRegistry } from '@wac/tool-system';

export async function registerToolRoutes(
  app: FastifyInstance,
  registry: ToolRegistry,
  runner: ToolRunner,
): Promise<void> {
  app.get('/api/tools', async (): Promise<ToolListResponse> => ({
    tools: registry.list(),
  }));

  app.post('/api/tools/run', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<ToolCallRequest>;
    if (!body.name) {
      return reply.code(400).send({ error: 'name is required' });
    }
    return runner.run(body.name, body.input ?? {});
  });
}
