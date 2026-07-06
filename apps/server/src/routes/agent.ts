import type { FastifyInstance } from 'fastify';
import { runAgentLoop } from '@wac/agent-core';
import type { ContextEngine } from '@wac/context-engine';
import type { HookRegistry } from '@wac/hooks';
import type { ModelProvider } from '@wac/model-provider';
import type { TodoPlanner } from '@wac/planner';
import type { SkillRegistry } from '@wac/skills';
import type { SubagentCoordinator } from '@wac/subagents';
import {
  sseFrame,
  type AgentRunEvent,
  type AgentRunId,
  type AgentRunRequest,
  type AgentRunStepType,
  type ProductTaskId,
  type ProductTaskStopReason,
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
    planner: TodoPlanner;
    skillRegistry: SkillRegistry;
    subagents: SubagentCoordinator;
    sessionStore: SessionStore;
    hooks: HookRegistry;
    activateWorkspace?: (workspaceId: string) => Promise<void>;
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

    const task = body.taskId
      ? deps.sessionStore.getTask(body.taskId)
      : await deps.sessionStore.createTask({
          sessionId: session.id,
          workspaceId: body.workspaceId,
          title: body.message.trim().slice(0, 80),
          message: body.message.trim(),
        });
    if (!task) {
      return reply.code(404).send({ error: 'task not found' });
    }

    const run = await deps.sessionStore.createRun(session.id, body.message.trim());
    await deps.sessionStore.updateTask(task.id, {
      status: 'planning',
      activeRunId: run.id,
      taskSummary: body.message.trim(),
    });
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
      if (body.workspaceId && deps.activateWorkspace) {
        await deps.activateWorkspace(body.workspaceId);
      }
      deps.model.resetUsage?.();
      const runningSession = await deps.sessionStore.updateSessionStatus(session.id, 'running');
      await deps.sessionStore.updateRunStatus(run.id, 'running');
      await deps.sessionStore.updateTask(task.id, { status: 'running', activeRunId: run.id });
      const createdEvent: AgentRunEvent = {
        type: 'agent.run_created',
        session: runningSession,
        run: deps.sessionStore.getRun(run.id) ?? run,
      };
      await recordEvent(deps.sessionStore, run.id, session.id, task.id, createdEvent);
      res.write(sseFrame(createdEvent));

      for await (const event of runAgentLoop(
        {
          sessionId: session.id,
          taskId: task.id,
          message: body.message,
          modelRoute: body.modelRoute,
          maxIterations: body.maxIterations,
        },
        {
          model: deps.model,
          tools: deps.toolRegistry.list(),
          toolRunner: deps.toolRunner,
          contextEngine: deps.contextEngine,
          planner: deps.planner,
          skillRegistry: deps.skillRegistry,
          subagents: deps.subagents,
          runId: run.id,
          maxIterations: 6,
          signal: controller.signal,
          stepDelayMs: 150,
        },
      )) {
        await recordEvent(deps.sessionStore, run.id, session.id, task.id, event);
        res.write(sseFrame(event));
        if (event.type === 'agent.done') {
          const hookResult = await deps.hooks.onAgentStop({
            sessionId: session.id,
            runId: run.id,
            subject: run.id,
            finishReason: event.finishReason,
          });
          await deps.sessionStore.saveHookRecords(hookResult.records);
          const status =
            event.finishReason === 'cancelled'
              ? 'cancelled'
              : event.finishReason === 'error' ||
                  event.finishReason === 'max_iterations' ||
                  event.finishReason === 'budget_exceeded'
                ? 'failed'
                : 'completed';
          await deps.sessionStore.updateTask(task.id, {
            status:
              event.finishReason === 'cancelled'
                ? 'cancelled'
                : event.finishReason === 'max_iterations'
                  ? 'blocked'
                  : event.finishReason === 'approval_required'
                    ? 'waiting_approval'
                    : event.finishReason === 'sandbox_failed'
                      ? 'failed'
                      : event.finishReason === 'budget_exceeded'
                        ? 'failed'
                      : status,
            stopReason: stopReasonForFinish(event.finishReason),
            activeRunId: undefined,
            latestDecision: event.finishReason,
          });
          await deps.sessionStore.saveMemory({
            scope: 'conversation',
            sessionId: session.id,
            runId: run.id,
            workspaceId: body.workspaceId,
            summary: `Task ${task.title} stopped with ${event.finishReason}.`,
            source: 'agent.done',
          });
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
      await recordEvent(deps.sessionStore, run.id, session.id, task.id, errorEvent);
      await recordEvent(deps.sessionStore, run.id, session.id, task.id, doneEvent);
      await deps.sessionStore.updateTask(task.id, {
        status: 'failed',
        stopReason: 'error',
        activeRunId: undefined,
        latestDecision: errorEvent.message,
      });
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
  taskId: ProductTaskId,
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
  await appendTaskMessageForEvent(sessionStore, taskId, storedEvent);
  if (storedEvent.type === 'agent.tool_result' && storedEvent.result.hooks) {
    await sessionStore.saveHookRecords(storedEvent.result.hooks);
  }
  await sessionStore.appendRunEvent(runId, storedEvent);
  await sessionStore.appendStep(
    runId,
    classifyStep(storedEvent),
    titleForEvent(storedEvent),
    storedEvent,
  );
}

async function appendTaskMessageForEvent(
  sessionStore: SessionStore,
  taskId: ProductTaskId,
  event: AgentRunEvent,
): Promise<void> {
  if (event.type === 'agent.message') {
    await sessionStore.appendTaskMessage(taskId, {
      role: 'assistant',
      content: event.content,
    });
  }
  if (event.type === 'agent.status') {
    await sessionStore.appendTaskMessage(taskId, {
      role: 'status',
      content: event.message,
    });
  }
  if (event.type === 'agent.tool_call') {
    await sessionStore.appendTaskMessage(taskId, {
      role: 'tool',
      content: `调用工具 ${event.call.name}`,
    });
  }
  if (event.type === 'agent.tool_result') {
    await sessionStore.appendTaskMessage(taskId, {
      role: 'tool',
      content: event.result.ok
        ? `工具 ${event.result.name} 完成`
        : `工具 ${event.result.name} 失败：${event.result.error ?? 'unknown error'}`,
    });
  }
  if (event.type === 'agent.model_call') {
    const cost = event.call.cost ? ` $${event.call.cost.totalUsd.toFixed(6)}` : '';
    const fallback = event.call.fallback ? ' fallback=mock' : '';
    await sessionStore.appendTaskMessage(taskId, {
      role: 'status',
      content: `模型 ${event.call.route ?? 'default'} ${event.call.provider}/${event.call.model} ${event.call.status} ${event.call.latencyMs}ms${cost}${fallback}`,
      refId: event.call.id,
    });
  }
  if (event.type === 'agent.error') {
    await sessionStore.appendTaskMessage(taskId, {
      role: 'error',
      content: event.message,
    });
  }
  if (event.type === 'agent.done') {
    await sessionStore.appendTaskMessage(taskId, {
      role: 'status',
      content: `任务停止：${event.finishReason}`,
    });
  }
}

function stopReasonForFinish(
  reason: Extract<AgentRunEvent, { type: 'agent.done' }>['finishReason'],
): ProductTaskStopReason {
  if (reason === 'cancelled') return 'cancelled';
  if (reason === 'max_iterations') return 'max_iterations';
  if (reason === 'budget_exceeded') return 'budget_exceeded';
  if (reason === 'approval_required') return 'approval_required';
  if (reason === 'sandbox_failed') return 'sandbox_failed';
  if (reason === 'error') return 'error';
  return 'done';
}

function classifyStep(event: AgentRunEvent): AgentRunStepType {
  switch (event.type) {
    case 'agent.iteration':
      return 'status';
    case 'agent.context_summary':
      return 'context_summary';
    case 'agent.todo_updated':
      return 'todo';
    case 'agent.skill_selected':
      return 'skill';
    case 'agent.subagent_summary':
      return 'subagent';
    case 'agent.tool_result':
      return event.result.hooks?.some((hook) => hook.status === 'blocked') ? 'hook' : 'tool_result';
    case 'agent.model_call':
      return 'model_call';
    case 'agent.tool_call':
      return 'tool_call';
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
    case 'agent.todo_updated':
      return `Todo updated: ${event.reason}`;
    case 'agent.skill_selected':
      return `Skill selected: ${event.selection.skill.name}`;
    case 'agent.subagent_summary':
      return `Subagents planned: ${event.summary.summaries.map((item) => item.role).join(', ')}`;
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
