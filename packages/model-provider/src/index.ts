import type {
  JsonSchema,
  ModelMessage,
  ModelBudget,
  ModelBudgetState,
  ModelCost,
  ModelProviderInfo,
  ModelProviderKind,
  ModelRequest,
  ModelResponse,
  ModelRouteRole,
  ModelRouterStatus,
  ModelUsage,
  ToolCallRequest,
} from '@wac/shared';

export interface ModelProvider {
  readonly info: ModelProviderInfo;
  complete(request: ModelRequest): Promise<ModelResponse>;
  resetUsage?(): void;
  status?(): ModelRouterStatus;
}

export interface RoutedModelResponse extends ModelResponse {
  route: ModelRouteRole;
  fallback: boolean;
  cost: ModelCost;
}

export interface OpenAICompatibleProviderOptions {
  apiKey?: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export interface CreateModelProviderOptions {
  provider: ModelProviderKind;
  apiKey?: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export interface CreateModelRouterOptions extends CreateModelProviderOptions {
  defaultRoute?: ModelRouteRole;
  budget?: Partial<ModelBudget>;
  fallbackToMock?: boolean;
  inputTokenUsdPer1K?: number;
  outputTokenUsdPer1K?: number;
}

export class ModelProviderError extends Error {
  constructor(
    message: string,
    readonly code: 'missing_api_key' | 'http_error' | 'timeout' | 'invalid_response',
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ModelProviderError';
  }
}

export class MockModelProvider implements ModelProvider {
  readonly info: ModelProviderInfo;

  constructor(model = 'mock-coding-agent') {
    this.info = {
      provider: 'mock',
      model,
      configured: true,
      status: 'configured',
      message: '使用离线 mock provider，适合教学和无 API key 环境。',
      timeoutMs: 0,
    };
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const toolMessages = request.messages.filter((message) => message.role === 'tool');
    const lastTool = toolMessages.at(-1);

    if (!lastTool) {
      const userMessage = lastUserMessage(request.messages);
      const call = firstToolCall(userMessage);
      return {
        content: `我会先调用 ${call.name} 收集 workspace 观察结果。`,
        toolCalls: [call],
        usage: estimateUsage(request, `tool:${call.name}`),
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
          usage: estimateUsage(request, `read:${path}`),
        };
      }
      return {
        content: '搜索没有命中文件，当前最小 Agent Loop 到此停止。',
        final: true,
        usage: estimateUsage(request, 'final:no-search-hit'),
      };
    }

    if (lastTool.toolName === 'read_file') {
      const output = parseToolOutput(lastTool.content);
      if (isRecord(output) && typeof output.error === 'string') {
        return {
          content: `读取文件失败，但错误已作为 observation 返回循环：${output.error}`,
          final: true,
          usage: estimateUsage(request, 'final:read-error'),
        };
      }
      const path = isRecord(output) && typeof output.path === 'string' ? output.path : '目标文件';
      return {
        content: `已读取 ${path}。最小 Agent Loop 已完成：模型提出工具调用，工具返回 observation，模型输出 final answer。`,
        final: true,
        usage: estimateUsage(request, `final:${path}`),
      };
    }

    if (lastTool.toolName === 'get_workspace_tree') {
      return {
        content: '已获取 workspace 文件树。最小 Agent Loop 已完成一次工具观察循环。',
        final: true,
        usage: estimateUsage(request, 'final:tree'),
      };
    }

    if (lastTool.toolName === 'get_diagnostics') {
      const output = parseToolOutput(lastTool.content);
      const count =
        isRecord(output) && Array.isArray(output.diagnostics) ? output.diagnostics.length : 0;
      return {
        content: `已获取 TypeScript diagnostics，共 ${count} 条。Agent 已把编译器反馈作为 observation。`,
        final: true,
        usage: estimateUsage(request, `final:diagnostics:${count}`),
      };
    }

    return {
      content: '收到工具 observation，最小 Agent Loop 已停止。',
      final: true,
      usage: estimateUsage(request, 'final:generic'),
    };
  }
}

export class OpenAICompatibleModelProvider implements ModelProvider {
  readonly info: ModelProviderInfo;
  private readonly apiKey?: string;
  private readonly endpoint: string;

  constructor(private readonly options: OpenAICompatibleProviderOptions) {
    this.apiKey = options.apiKey?.trim() || undefined;
    const baseUrl = options.baseUrl.replace(/\/+$/u, '');
    this.endpoint = `${baseUrl}/v1/chat/completions`;
    this.info = {
      provider: 'openai_compatible',
      model: options.model,
      configured: Boolean(this.apiKey),
      status: this.apiKey ? 'configured' : 'missing_api_key',
      message: this.apiKey
        ? '真实模型 provider 已配置。'
        : '真实模型 provider 已选择，但缺少 API key。',
      baseUrl,
      timeoutMs: options.timeoutMs,
    };
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    if (!this.apiKey) {
      throw new ModelProviderError('缺少模型 API key。', 'missing_api_key');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: request.messages.map(toChatMessage),
          tools: request.tools.map((tool) => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: toOpenAISchema(tool.schema),
            },
          })),
          tool_choice: request.tools.length > 0 ? 'auto' : undefined,
        }),
        signal: controller.signal,
      });

      const raw = await response.text();
      if (!response.ok) {
        throw new ModelProviderError(
          `模型 API 请求失败：HTTP ${response.status} ${shorten(raw)}`,
          'http_error',
          response.status,
        );
      }

      const payload = parseJson(raw);
      if (!isRecord(payload)) {
        throw new ModelProviderError('模型 API 返回不是 JSON object。', 'invalid_response');
      }
      const choice = firstChoice(payload);
      if (!choice) {
        throw new ModelProviderError('模型 API 返回空 choices。', 'invalid_response');
      }

      const message = choice.message;
      if (!isRecord(message)) {
        throw new ModelProviderError('模型 API 返回缺少 message。', 'invalid_response');
      }

      const content = typeof message.content === 'string' ? message.content : undefined;
      const toolCalls = parseToolCalls(message.tool_calls);
      return {
        content,
        toolCalls,
        final: toolCalls.length === 0,
        usage: parseUsage(payload.usage),
      };
    } catch (err) {
      if (err instanceof ModelProviderError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ModelProviderError(`模型 API 超时：${this.options.timeoutMs}ms。`, 'timeout');
      }
      throw new ModelProviderError(
        err instanceof Error ? err.message : String(err),
        'http_error',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class ModelBudgetExceededError extends Error {
  readonly code = 'budget_exceeded';

  constructor(readonly state: ModelBudgetState) {
    super(
      `模型预算已耗尽：tokens ${state.usedTokens}/${state.budget.maxTokens}, cost $${state.usedCostUsd.toFixed(6)}/$${state.budget.maxCostUsd.toFixed(6)}。`,
    );
    this.name = 'ModelBudgetExceededError';
  }
}

export class ModelRouter implements ModelProvider {
  readonly info: ModelProviderInfo;
  private readonly mock = new MockModelProvider();
  private readonly routes: Record<ModelRouteRole, ModelProvider>;
  private readonly defaultRoute: ModelRouteRole;
  private readonly budget: ModelBudget;
  private readonly fallbackToMock: boolean;
  private readonly inputTokenUsdPer1K: number;
  private readonly outputTokenUsdPer1K: number;
  private usedTokens = 0;
  private usedCostUsd = 0;

  constructor(
    private readonly primary: ModelProvider,
    options: CreateModelRouterOptions,
  ) {
    this.routes = {
      cheap: primary,
      default: primary,
      reasoning: primary,
      reviewer: primary,
    };
    this.defaultRoute = options.defaultRoute ?? 'default';
    this.budget = {
      maxTokens: options.budget?.maxTokens ?? 100_000,
      maxCostUsd: options.budget?.maxCostUsd ?? 1,
    };
    this.fallbackToMock = options.fallbackToMock ?? true;
    this.inputTokenUsdPer1K = options.inputTokenUsdPer1K ?? 0.00014;
    this.outputTokenUsdPer1K = options.outputTokenUsdPer1K ?? 0.00028;
    this.info = {
      ...primary.info,
      message: `Model Router active. ${primary.info.message}`,
    };
  }

  async complete(request: ModelRequest): Promise<RoutedModelResponse> {
    const route = request.route ?? this.defaultRoute;
    this.ensureBudgetAvailable();
    const provider = this.routes[route] ?? this.routes.default;
    try {
      const response = await provider.complete({ ...request, route });
      return this.record(response, route, false);
    } catch (err) {
      if (err instanceof ModelBudgetExceededError) throw err;
      if (!this.fallbackToMock || provider.info.provider === 'mock') throw err;
      const fallback = await this.mock.complete({ ...request, route });
      return this.record(fallback, route, true);
    }
  }

  status(): ModelRouterStatus {
    return {
      routes: (Object.keys(this.routes) as ModelRouteRole[]).map((role) => {
        const provider = this.routes[role];
        return {
          role,
          provider: provider.info.provider,
          model: provider.info.model,
          fallbackToMock: this.fallbackToMock,
        };
      }),
      defaultRoute: this.defaultRoute,
      budget: this.budget,
      usage: this.budgetState(),
    };
  }

  resetUsage(): void {
    this.usedTokens = 0;
    this.usedCostUsd = 0;
  }

  private record(response: ModelResponse, route: ModelRouteRole, fallback: boolean): RoutedModelResponse {
    const usage = normalizeUsage(response.usage);
    const cost = estimateCost(usage, this.inputTokenUsdPer1K, this.outputTokenUsdPer1K);
    this.usedTokens += usage.totalTokens ?? 0;
    this.usedCostUsd += cost.totalUsd;
    return {
      ...response,
      usage,
      route,
      fallback,
      cost,
    };
  }

  private ensureBudgetAvailable(): void {
    const state = this.budgetState();
    if (state.exceeded) throw new ModelBudgetExceededError(state);
  }

  private budgetState(): ModelBudgetState {
    return {
      budget: this.budget,
      usedTokens: this.usedTokens,
      usedCostUsd: roundUsd(this.usedCostUsd),
      remainingTokens: Math.max(0, this.budget.maxTokens - this.usedTokens),
      remainingCostUsd: roundUsd(Math.max(0, this.budget.maxCostUsd - this.usedCostUsd)),
      exceeded: this.usedTokens >= this.budget.maxTokens || this.usedCostUsd >= this.budget.maxCostUsd,
    };
  }
}

export function createModelProvider(options: CreateModelProviderOptions): ModelProvider {
  if (options.provider === 'mock') return new MockModelProvider();
  return new OpenAICompatibleModelProvider({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    model: options.model,
    timeoutMs: options.timeoutMs,
  });
}

export function createModelRouter(options: CreateModelRouterOptions): ModelRouter {
  return new ModelRouter(createModelProvider(options), options);
}

export function isModelBudgetExceededError(err: unknown): err is ModelBudgetExceededError {
  return err instanceof ModelBudgetExceededError;
}

function normalizeUsage(usage: ModelUsage | undefined): Required<ModelUsage> {
  const promptTokens = usage?.promptTokens ?? 0;
  const completionTokens = usage?.completionTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

function estimateCost(
  usage: ModelUsage,
  inputUsdPer1K: number,
  outputUsdPer1K: number,
): ModelCost {
  const inputUsd = ((usage.promptTokens ?? 0) / 1000) * inputUsdPer1K;
  const outputUsd = ((usage.completionTokens ?? 0) / 1000) * outputUsdPer1K;
  return {
    inputUsd: roundUsd(inputUsd),
    outputUsd: roundUsd(outputUsd),
    totalUsd: roundUsd(inputUsd + outputUsd),
  };
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function firstToolCall(userMessage: string): ToolCallRequest {
  const lower = userMessage.toLowerCase();
  if (
    lower.includes('diagnostic') ||
    lower.includes('typecheck') ||
    lower.includes('typescript') ||
    userMessage.includes('诊断') ||
    userMessage.includes('类型错误') ||
    userMessage.includes('编译错误')
  ) {
    return {
      name: 'get_diagnostics',
      input: {},
    };
  }

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

function estimateUsage(request: ModelRequest, responseHint: string): ModelUsage {
  const promptTokens = Math.ceil(
    request.messages.reduce((total, message) => total + message.content.length, 0) / 4,
  );
  const completionTokens = Math.ceil(responseHint.length / 4);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

function toChatMessage(message: ModelMessage): Record<string, string> {
  if (message.role === 'tool') {
    return {
      role: 'user',
      content: `Tool observation from ${message.toolName ?? 'tool'}:\n${message.content}`,
    };
  }
  return {
    role: message.role,
    content: message.content,
  };
}

function toOpenAISchema(schema: JsonSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: schema.type,
  };
  if (schema.description) result.description = schema.description;
  if (schema.required) result.required = schema.required;
  if (schema.additionalProperties !== undefined) {
    result.additionalProperties = schema.additionalProperties;
  }
  if (schema.minLength !== undefined) result.minLength = schema.minLength;
  if (schema.properties) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toOpenAISchema(value)]),
    );
  }
  return result;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ModelProviderError('模型 API 返回不是合法 JSON。', 'invalid_response');
  }
}

function firstChoice(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return null;
  const first = payload.choices[0];
  return isRecord(first) ? first : null;
}

function parseToolCalls(value: unknown): ToolCallRequest[] {
  if (!Array.isArray(value)) return [];
  const calls: ToolCallRequest[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isRecord(item.function)) continue;
    const name = item.function.name;
    if (typeof name !== 'string') continue;
    calls.push({
      name,
      input: parseToolArguments(item.function.arguments),
    });
  }
  return calls;
}

function parseToolArguments(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}

function parseUsage(value: unknown): ModelUsage | undefined {
  if (!isRecord(value)) return undefined;
  return {
    promptTokens: numberOrUndefined(value.prompt_tokens),
    completionTokens: numberOrUndefined(value.completion_tokens),
    totalTokens: numberOrUndefined(value.total_tokens),
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function shorten(value: string): string {
  return value.length > 240 ? `${value.slice(0, 240)}...` : value;
}
