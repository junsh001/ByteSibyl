/**
 * Minimal streaming client for the DeepSeek (OpenAI-compatible) chat API,
 * with tool-calling support. No SDK dependency — just fetch + SSE parsing.
 */

export interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  reasonerModel: string;
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string of arguments. */
  arguments: string;
}

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  /** Present on assistant turns that requested tools. */
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  /** Present on tool-result turns. */
  tool_call_id?: string;
  name?: string;
}

export type StreamDelta =
  | { kind: 'content'; text: string }
  | { kind: 'reasoning'; text: string }
  | { kind: 'tool_call'; index: number; id?: string; name?: string; argsDelta?: string }
  | { kind: 'finish'; reason: string }
  | { kind: 'usage'; promptTokens: number; completionTokens: number };

export interface CompletionParams {
  messages: ChatTurn[];
  tools?: ToolSchema[];
  reasoning?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export async function* streamCompletion(
  cfg: DeepSeekConfig,
  params: CompletionParams,
): AsyncGenerator<StreamDelta> {
  const model = params.reasoning ? cfg.reasonerModel : cfg.model;
  const body: Record<string, unknown> = {
    model,
    stream: true,
    stream_options: { include_usage: true },
    messages: params.messages,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? 4096,
  };
  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: params.signal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${res.status}: ${detail.slice(0, 500)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      let json: any;
      try {
        json = JSON.parse(data);
      } catch {
        continue;
      }
      if (json.usage) {
        yield {
          kind: 'usage',
          promptTokens: json.usage.prompt_tokens ?? 0,
          completionTokens: json.usage.completion_tokens ?? 0,
        };
      }
      const choice = json.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta ?? {};
      if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
        yield { kind: 'reasoning', text: delta.reasoning_content };
      }
      if (typeof delta.content === 'string' && delta.content) {
        yield { kind: 'content', text: delta.content };
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          yield {
            kind: 'tool_call',
            index: tc.index ?? 0,
            id: tc.id,
            name: tc.function?.name,
            argsDelta: tc.function?.arguments,
          };
        }
      }
      if (choice.finish_reason) {
        yield { kind: 'finish', reason: choice.finish_reason };
      }
    }
  }
}

/** Non-streaming convenience call (used by the tutorial grader & eval harness). */
export async function complete(
  cfg: DeepSeekConfig,
  params: CompletionParams,
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.reasoning ? cfg.reasonerModel : cfg.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 2048,
    }),
    signal: params.signal,
  });
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  const json: any = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}
