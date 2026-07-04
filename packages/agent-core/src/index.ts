import { randomUUID } from 'node:crypto';
import type { ContextEngine } from '@wac/context-engine';
import type { ModelProvider } from '@wac/model-provider';
import type { TodoPlanner } from '@wac/planner';
import type {
  AgentRunEvent,
  AgentRunRequest,
  ModelCallRecord,
  ModelMessage,
  ToolCallRequest,
  ToolDefinition,
  TodoItem,
} from '@wac/shared';
import type { ToolRunner } from '@wac/tool-system';

export interface AgentLoopOptions {
  model: ModelProvider;
  tools: ToolDefinition[];
  toolRunner: ToolRunner;
  contextEngine?: ContextEngine;
  planner?: TodoPlanner;
  maxIterations?: number;
  signal?: AbortSignal;
  stepDelayMs?: number;
}

export async function* runAgentLoop(
  request: AgentRunRequest,
  options: AgentLoopOptions,
): AsyncGenerator<AgentRunEvent> {
  const maxIterations = request.maxIterations ?? options.maxIterations ?? 6;
  const stepDelayMs = options.stepDelayMs ?? 0;
  const messages: ModelMessage[] = [
    {
      role: 'system',
      content:
        'You are a minimal teaching coding agent. Use structured tools to inspect the workspace, then stop with a concise final answer.',
    },
    {
      role: 'user',
      content: request.message,
    },
  ];

  yield {
    type: 'agent.status',
    status: 'running',
    message: `Agent Loop started with maxIterations=${maxIterations}.`,
  };
  if (options.planner) {
    yield todoEvent(options.planner.createInitialPlan(request.message), 'Agent run created plan.');
  }

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    if (options.signal?.aborted) {
      yield cancelledEvent();
      return;
    }
    await wait(stepDelayMs, options.signal);
    if (options.signal?.aborted) {
      yield cancelledEvent();
      return;
    }

    yield {
      type: 'agent.iteration',
      iteration,
      maxIterations,
    };
    if (options.planner) {
      yield todoEvent(
        options.planner.completeStep('理解任务', 'Task accepted by agent loop.'),
        'Task accepted by agent loop.',
      );
      yield todoEvent(
        options.planner.startStep('构建上下文', 'Preparing model context.'),
        'Preparing model context.',
      );
    }

    const contextResult = options.contextEngine
      ? await options.contextEngine.build({
          task: request.message,
          messages,
          tools: options.tools,
        })
      : undefined;
    if (contextResult) {
      if (options.planner) {
        yield todoEvent(
          options.planner.completeStep('构建上下文', 'Context summary generated.'),
          'Context summary generated.',
        );
        yield todoEvent(
          options.planner.startStep('调用模型', 'Calling model provider.'),
          'Calling model provider.',
        );
      }
      yield {
        type: 'agent.context_summary',
        summary: contextResult.summary,
      };
    }

    const modelMessages = contextResult
      ? withContextMessage(messages, contextResult.contextMessage)
      : messages;
    const requestSummary = summarizeModelRequest(modelMessages, options.tools);
    const modelStartedAt = Date.now();
    let response;
    try {
      response = await options.model.complete({
        messages: modelMessages,
        tools: options.tools,
      });
    } catch (err) {
      const latencyMs = Date.now() - modelStartedAt;
      const message = err instanceof Error ? err.message : String(err);
      if (options.planner) {
        yield todoEvent(options.planner.blockCurrent(message), message);
      }
      yield {
        type: 'agent.model_call',
        call: createModelCallRecord({
          provider: options.model,
          status: message.includes('超时') ? 'timed_out' : 'failed',
          latencyMs,
          requestSummary,
          error: message,
        }),
      };
      yield {
        type: 'agent.error',
        message,
      };
      yield {
        type: 'agent.done',
        finishReason: 'error',
      };
      return;
    }

    const latencyMs = Date.now() - modelStartedAt;
    yield {
      type: 'agent.model_call',
      call: createModelCallRecord({
        provider: options.model,
        status: 'completed',
        latencyMs,
        requestSummary,
        responseSummary: summarizeModelResponse(response.content, response.toolCalls?.length ?? 0),
        usage: response.usage,
      }),
    };
    if (options.planner) {
      yield todoEvent(
        options.planner.completeStep('调用模型', 'Model provider returned.'),
        'Model provider returned.',
      );
    }
    if (options.signal?.aborted) {
      yield cancelledEvent();
      return;
    }

    if (response.content) {
      messages.push({ role: 'assistant', content: response.content });
      yield {
        type: 'agent.message',
        role: 'assistant',
        content: response.content,
      };
    }

    const toolCalls = response.toolCalls ?? [];
    if (toolCalls.length === 0 || response.final) {
      if (options.planner) {
        yield todoEvent(options.planner.completeAll('Run finished without more tool calls.'), 'Run completed.');
      }
      yield {
        type: 'agent.done',
        finishReason: response.final ? 'final' : 'stop',
      };
      return;
    }

    for (const toolCall of toolCalls) {
      if (options.signal?.aborted) {
        yield cancelledEvent();
        return;
      }

      yield {
        type: 'agent.tool_call',
        call: toolCall,
      };
      if (options.planner) {
        yield todoEvent(
          options.planner.startStep('执行工具', `Running ${toolCall.name}.`),
          `Running ${toolCall.name}.`,
        );
      }

      await wait(stepDelayMs, options.signal);
      if (options.signal?.aborted) {
        yield cancelledEvent();
        return;
      }

      const result = await options.toolRunner.run(toolCall.name, toolCall.input);
      yield {
        type: 'agent.tool_result',
        result,
      };
      if (options.planner) {
        if (result.ok) {
          yield todoEvent(
            options.planner.completeStep('执行工具', `${result.name} returned observation.`),
            `${result.name} returned observation.`,
          );
        } else {
          yield todoEvent(
            options.planner.blockCurrent(result.error ?? `${result.name} failed.`),
            result.error ?? `${result.name} failed.`,
          );
        }
      }

      messages.push({
        role: 'tool',
        toolName: toolCall.name,
        content: JSON.stringify(result.output ?? { error: result.error }),
      });
    }
  }

  yield {
    type: 'agent.error',
    message: `Reached maxIterations=${maxIterations} before final answer.`,
  };
  if (options.planner) {
    yield todoEvent(
      options.planner.blockCurrent(`Reached maxIterations=${maxIterations} before final answer.`),
      'Max iterations reached before final answer.',
    );
  }
  yield {
    type: 'agent.done',
    finishReason: 'max_iterations',
  };
}

export type { ToolCallRequest };

function cancelledEvent(): AgentRunEvent {
  return {
    type: 'agent.done',
    finishReason: 'cancelled',
  };
}

function todoEvent(todos: TodoItem[], reason: string): AgentRunEvent {
  return {
    type: 'agent.todo_updated',
    todos,
    reason,
  };
}

function createModelCallRecord(input: {
  provider: ModelProvider;
  status: ModelCallRecord['status'];
  latencyMs: number;
  requestSummary: string;
  responseSummary?: string;
  usage?: ModelCallRecord['usage'];
  error?: string;
}): ModelCallRecord {
  return {
    id: randomUUID(),
    provider: input.provider.info.provider,
    model: input.provider.info.model,
    status: input.status,
    latencyMs: input.latencyMs,
    requestSummary: input.requestSummary,
    responseSummary: input.responseSummary,
    usage: input.usage,
    error: input.error,
    createdAt: new Date().toISOString(),
  };
}

function summarizeModelRequest(messages: ModelMessage[], tools: ToolDefinition[]): string {
  const last = messages.at(-1);
  return `${messages.length} messages, ${tools.length} tools, last=${last?.role ?? 'none'}:${(
    last?.content ?? ''
  ).slice(0, 80)}`;
}

function summarizeModelResponse(content: string | undefined, toolCallCount: number): string {
  return `content=${content ? content.slice(0, 80) : 'none'}, toolCalls=${toolCallCount}`;
}

function withContextMessage(messages: ModelMessage[], contextMessage: ModelMessage): ModelMessage[] {
  const [first, ...rest] = messages;
  if (first?.role === 'system') {
    return [first, contextMessage, ...rest];
  }
  return [contextMessage, ...messages];
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}
