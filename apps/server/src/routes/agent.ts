import type { FastifyInstance } from 'fastify';
import { runAgentLoop } from '@wac/agent-core';
import type { ModelProvider } from '@wac/model-provider';
import { sseFrame, type AgentRunRequest } from '@wac/shared';
import type { ToolRunner, ToolRegistry } from '@wac/tool-system';

export async function registerAgentRoutes(
  app: FastifyInstance,
  deps: {
    model: ModelProvider;
    toolRegistry: ToolRegistry;
    toolRunner: ToolRunner;
  },
): Promise<void> {
  app.post('/api/agent/run', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<AgentRunRequest>;
    if (!body.message?.trim()) {
      return reply.code(400).send({ error: 'message is required' });
    }

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      for await (const event of runAgentLoop(
        {
          message: body.message,
          maxIterations: body.maxIterations,
        },
        {
          model: deps.model,
          tools: deps.toolRegistry.list(),
          toolRunner: deps.toolRunner,
          maxIterations: 6,
        },
      )) {
        res.write(sseFrame(event));
      }
    } catch (err) {
      res.write(
        sseFrame({
          type: 'agent.error',
          message: err instanceof Error ? err.message : String(err),
        }),
      );
      res.write(
        sseFrame({
          type: 'agent.done',
          finishReason: 'error',
        }),
      );
    } finally {
      res.end();
    }
  });
}
