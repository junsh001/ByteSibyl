import type { ModelMessage, ModelRequest, ModelResponse, ToolCallRequest } from '@wac/shared';

export interface ModelProvider {
  complete(request: ModelRequest): Promise<ModelResponse>;
}

export class MockModelProvider implements ModelProvider {
  async complete(request: ModelRequest): Promise<ModelResponse> {
    const toolMessages = request.messages.filter((message) => message.role === 'tool');
    const lastTool = toolMessages.at(-1);

    if (!lastTool) {
      const userMessage = lastUserMessage(request.messages);
      const call = firstToolCall(userMessage);
      return {
        content: `我会先调用 ${call.name} 收集 workspace 观察结果。`,
        toolCalls: [call],
      };
    }

    if (lastTool.toolName === 'search_text') {
      const output = parseToolOutput(lastTool.content);
      const path = firstSearchPath(output);
      if (path) {
        return {
          content: `搜索结果指向 ${path}，继续读取该文件。`,
          toolCalls: [
            {
              name: 'read_file',
              input: { path },
            },
          ],
        };
      }
      return {
        content: '搜索没有命中文件，当前最小 Agent Loop 到此停止。',
        final: true,
      };
    }

    if (lastTool.toolName === 'read_file') {
      const output = parseToolOutput(lastTool.content);
      if (isRecord(output) && typeof output.error === 'string') {
        return {
          content: `读取文件失败，但错误已作为 observation 返回循环：${output.error}`,
          final: true,
        };
      }
      const path = isRecord(output) && typeof output.path === 'string' ? output.path : '目标文件';
      return {
        content: `已读取 ${path}。最小 Agent Loop 已完成：模型提出工具调用，工具返回 observation，模型输出 final answer。`,
        final: true,
      };
    }

    if (lastTool.toolName === 'get_workspace_tree') {
      return {
        content: '已获取 workspace 文件树。最小 Agent Loop 已完成一次工具观察循环。',
        final: true,
      };
    }

    return {
      content: '收到工具 observation，最小 Agent Loop 已停止。',
      final: true,
    };
  }
}

function firstToolCall(userMessage: string): ToolCallRequest {
  const lower = userMessage.toLowerCase();
  if (lower.includes('tree') || userMessage.includes('文件树') || userMessage.includes('结构')) {
    return {
      name: 'get_workspace_tree',
      input: {},
    };
  }

  const explicitPath = userMessage.match(/(?:[\w.-]+\/)*[\w.-]+\.(?:tsx|ts|jsx|json|js|md)|\.\.\/[\w./-]+/);
  if (explicitPath) {
    return {
      name: 'read_file',
      input: {
        path: explicitPath[0],
      },
    };
  }

  return {
    name: 'search_text',
    input: {
      query: extractQuery(userMessage),
    },
  };
}

function extractQuery(message: string): string {
  const codeLike = message.match(/[A-Za-z_$][\w$]{3,}/g);
  return codeLike?.at(-1) ?? 'formatUser';
}

function lastUserMessage(messages: ModelMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'user') return message.content;
  }
  return '';
}

function parseToolOutput(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function firstSearchPath(output: unknown): string | null {
  if (!isRecord(output) || !Array.isArray(output.matches)) return null;
  const first = output.matches[0];
  if (!isRecord(first) || typeof first.path !== 'string') return null;
  return first.path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
