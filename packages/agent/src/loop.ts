import type { AgentEvent, ChatMessage, ToolName } from '@wac/shared';
import { streamCompletion, type ChatTurn, type DeepSeekConfig } from './deepseek.js';
import { executeTool, TOOL_SCHEMAS, type ToolContext } from './tools.js';

const MAX_STEPS = 30;

export const SYSTEM_PROMPT = `You are an elite autonomous software engineer embedded in a web IDE. You help the user build, debug, and run code in a sandboxed project workspace.

Operating rules:
- Work in small, verifiable steps. Inspect before you change: use list_dir / read_file / search to understand the project before editing.
- Prefer edit_file for small targeted changes; use write_file for new files or full rewrites.
- After making code changes that can be executed, run them (run tool) to verify they work. Fix failures you observe.
- Keep the user informed with brief natural-language narration between tool calls, but do not pad — be concise and concrete.
- When the task is fully done and verified, call the finish tool with a short summary. Do not call finish prematurely.
- Never invent file contents you have not read. Never claim something runs if you have not run it.
- Default to modern, idiomatic, production-quality code that matches the existing style of the project.`;

export interface RunAgentInput {
  message: string;
  history?: ChatMessage[];
  reasoning?: boolean;
  mode?: 'agent' | 'ask';
}

interface PendingToolCall {
  id: string;
  name: string;
  args: string;
}

export async function* runAgent(
  cfg: DeepSeekConfig,
  input: RunAgentInput,
  ctx: Omit<ToolContext, 'allowMutations'>,
): AsyncGenerator<AgentEvent> {
  const allowMutations = input.mode !== 'ask';
  const toolCtx: ToolContext = { ...ctx, allowMutations };

  const messages: ChatTurn[] = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const m of input.history ?? []) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: 'user', content: input.message });

  let assistantBuffer = '';

  for (let step = 0; step < MAX_STEPS; step++) {
    yield { type: 'status', phase: 'thinking' };

    const pending = new Map<number, PendingToolCall>();
    let content = '';
    let finishReason = 'stop';

    try {
      for await (const delta of streamCompletion(cfg, {
        messages,
        tools: TOOL_SCHEMAS,
        reasoning: input.reasoning,
        signal: ctx.signal,
      })) {
        switch (delta.kind) {
          case 'content':
            content += delta.text;
            yield { type: 'token', text: delta.text };
            break;
          case 'reasoning':
            yield { type: 'reasoning', text: delta.text };
            break;
          case 'tool_call': {
            const cur = pending.get(delta.index) ?? { id: '', name: '', args: '' };
            if (delta.id) cur.id = delta.id;
            if (delta.name) cur.name = delta.name;
            if (delta.argsDelta) cur.args += delta.argsDelta;
            pending.set(delta.index, cur);
            break;
          }
          case 'usage':
            yield { type: 'usage', promptTokens: delta.promptTokens, completionTokens: delta.completionTokens };
            break;
          case 'finish':
            finishReason = delta.reason;
            break;
        }
      }
    } catch (err) {
      yield { type: 'error', message: err instanceof Error ? err.message : String(err) };
      yield { type: 'done', finishReason: 'error' };
      return;
    }

    const toolCalls = [...pending.values()].filter((t) => t.name);

    // No tool calls => the model gave a final answer.
    if (toolCalls.length === 0) {
      assistantBuffer += content;
      yield { type: 'done', finishReason };
      return;
    }

    // Record the assistant turn that requested tools.
    messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls.map((t) => ({
        id: t.id,
        type: 'function',
        function: { name: t.name, arguments: t.args || '{}' },
      })),
    });

    yield { type: 'status', phase: 'acting' };

    for (const tc of toolCalls) {
      const name = tc.name as ToolName;
      let args: Record<string, unknown> = {};
      try {
        args = tc.args ? JSON.parse(tc.args) : {};
      } catch {
        // Malformed arguments — report back to the model so it can retry.
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.name,
          content: `Error: could not parse tool arguments as JSON: ${tc.args}`,
        });
        continue;
      }

      yield { type: 'tool_call', id: tc.id, name, args };

      const outcome = await executeTool(name, args, toolCtx);

      yield {
        type: 'tool_result',
        id: tc.id,
        name,
        ok: outcome.ok,
        summary: outcome.summary,
      };
      if (outcome.fileChange) {
        yield { type: 'file_change', ...outcome.fileChange };
      }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        name: tc.name,
        content: outcome.content,
      });

      if (name === 'finish') {
        yield { type: 'done', finishReason: 'finish' };
        return;
      }
    }
  }

  yield { type: 'error', message: `Reached step limit (${MAX_STEPS}) without finishing.` };
  yield { type: 'done', finishReason: 'max_steps' };
}
