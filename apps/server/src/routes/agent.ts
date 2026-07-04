import type { FastifyInstance } from 'fastify';
import { runAgentLoop } from '@wac/agent-core';
import type { ContextEngine } from '@wac/context-engine';
import type { ModelProvider } from '@wac/model-provider';
import {
  sseFrame,
  type AgentRunEvent,
  type AgentRunId,
  type AgentRunRequest,
  type AgentRunStepType,
} from '@wac/shared';
import type { SessionStore } from '@wac/telemetry';
import type { ToolRunner, ToolRegistry } from '@wac/tool-system';

export async function registerAgentRoutes(
  app: FastifyInstance,
  deps: {
    model: ModelProvider;
    toolRegistry: ToolRegistry;
    toolRunner: ToolRunner;
    contextEngine: ContextEngine;
    sessionStore: SessionStore;
  },
): Promise<void> {
  const controllers = new Map<AgentRunId, AbortController>();

  app.post('/api/agent/run', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<AgentRunRequest>;
    if (!body.message?.trim()) {
      return reply.code(400).send({ error: 'message is required' });
    }

    const session = body.sessionId
      ? deps.sessionStore.getSession(body.sessionId)
      : await deps.sessionStore.createSession('Agent Session');
    if (!session) {
      return reply.code(404).send({ error: 'session not found' });
    }

    const run = await deps.sessionStore.createRun(session.id, body.message.trim());
    const controller = new AbortController();
    controllers.set(run.id, controller);

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      const runningSession = await deps.sessionStore.updateSessionStatus(session.id, 'running');
      await deps.sessionStore.updateRunStatus(run.id, 'running');
      const createdEvent: AgentRunEvent = {
        type: 'agent.run_created',
        session: runningSession,
        run: deps.sessionStore.getRun(run.id) ?? run,
      };
      await recordEvent(deps.sessionStore, run.id, session.id, createdEvent);
      res.write(sseFrame(createdEvent));

      for await (const event of runAgentLoop(
        {
          message: body.message,
          maxIterations: body.maxIterations,
        },
        {
          model: deps.model,
          tools: deps.toolRegistry.list(),
          toolRunner: deps.toolRunner,
          contextEngine: deps.contextEngine,
          maxIterations: 6,
          signal: controller.signal,
          stepDelayMs: 150,
        },
      )) {
        await recordEvent(deps.sessionStore, run.id, session.id, event);
        res.write(sseFrame(event));
        if (event.type === 'agent.done') {
          const status =
            event.finishReason === 'cancelled'
              ? 'cancelled'
              : event.finishReason === 'error' || event.finishReason === 'max_iterations'
                ? 'failed'
                : 'completed';
          await deps.sessionStore.updateRunStatus(run.id, status);
          await deps.sessionStore.updateSessionStatus(session.id, status);
        }
      }
    } catch (err) {
      const errorEvent: AgentRunEvent = {
        type: 'agent.error',
        message: err instanceof Error ? err.message : String(err),
      };
      const doneEvent: AgentRunEvent = {
        type: 'agent.done',
        finishReason: 'error',
      };
      await recordEvent(deps.sessionStore, run.id, session.id, errorEvent);
      await recordEvent(deps.sessionStore, run.id, session.id, doneEvent);
      await deps.sessionStore.updateRunStatus(run.id, 'failed');
      await deps.sessionStore.updateSessionStatus(session.id, 'failed');
      res.write(sseFrame(errorEvent));
      res.write(sseFrame(doneEvent));
    } finally {
      controllers.delete(run.id);
      res.end();
    }
  });

  app.post('/api/agent/runs/:runId/cancel', async (req, reply) => {
    const { runId } = req.params as { runId: AgentRunId };
    const run = deps.sessionStore.getRun(runId);
    if (!run) {
      return reply.code(404).send({ error: 'run not found' });
    }
    const controller = controllers.get(runId);
    if (!controller) {
      return reply.code(409).send({ error: 'run is not active' });
    }
    controller.abort();
    await deps.sessionStore.updateRunStatus(runId, 'cancelled');
    await deps.sessionStore.updateSessionStatus(run.sessionId, 'cancelled');
    return { run: deps.sessionStore.getRun(runId) };
  });
}

async function recordEvent(
  sessionStore: SessionStore,
  runId: AgentRunId,
  sessionId: string,
  event: AgentRunEvent,
): Promise<void> {
  const storedEvent =
    event.type === 'agent.model_call'
      ? {
          ...event,
          call: {
            ...event.call,
            sessionId,
            runId,
          },
        }
      : event;
  if (storedEvent.type === 'agent.model_call') {
    await sessionStore.saveModelCall(storedEvent.call);
  }
  await sessionStore.appendRunEvent(runId, storedEvent);
  await sessionStore.appendStep(
    runId,
    classifyStep(storedEvent),
    titleForEvent(storedEvent),
    storedEvent,
  );
}

function classifyStep(event: AgentRunEvent): AgentRunStepType {
  switch (event.type) {
    case 'agent.iteration':
      return 'status';
    case 'agent.context_summary':
      return 'context_summary';
    case 'agent.model_call':
      return 'model_call';
    case 'agent.tool_call':
      return 'tool_call';
    case 'agent.tool_result':
      return 'tool_result';
    case 'agent.done':
      return 'final';
    case 'agent.error':
      return 'error';
    case 'agent.message':
    case 'agent.run_created':
    case 'agent.status':
      return 'status';
  }
}

function titleForEvent(event: AgentRunEvent): string {
  switch (event.type) {
    case 'agent.run_created':
      return `Run created ${event.run.id}`;
    case 'agent.status':
      return event.message;
    case 'agent.iteration':
      return `Model iteration ${event.iteration}/${event.maxIterations}`;
    case 'agent.context_summary':
      return `Context summary ${event.summary.budget.usedChars}/${event.summary.budget.maxChars} chars`;
    case 'agent.model_call':
      return `Model call ${event.call.provider}/${event.call.model} ${event.call.status}`;
    case 'agent.message':
      return 'Assistant message';
    case 'agent.tool_call':
      return `Tool call ${event.call.name}`;
    case 'agent.tool_result':
      return `Tool result ${event.result.name}`;
    case 'agent.error':
      return event.message;
    case 'agent.done':
      return `Run finished: ${event.finishReason}`;
  }
}
