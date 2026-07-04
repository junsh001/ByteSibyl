import type { ModelProvider } from '@wac/model-provider';
import type {
  AgentRunEvent,
  AgentRunRequest,
  ModelMessage,
  ToolCallRequest,
  ToolDefinition,
} from '@wac/shared';
import type { ToolRunner } from '@wac/tool-system';

export interface AgentLoopOptions {
  model: ModelProvider;
  tools: ToolDefinition[];
  toolRunner: ToolRunner;
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

    const response = await options.model.complete({
      messages,
      tools: options.tools,
    });
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
