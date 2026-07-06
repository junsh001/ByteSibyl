# Product Phase 07 教程：实现可控的模型路由与成本边界

P7 的目标是让 Web AI Coding Agent 在调用真实模型时具备基本产品边界：知道用哪个模型、花了多少、
失败后如何降级、超预算如何停止。

## 1. 扩展共享协议

先在 `packages/shared` 中增加 route 和 budget contract：

- `ModelRouteRole`：`cheap | default | reasoning | reviewer`
- `ModelBudget`：每次运行允许的 token 和 cost 上限。
- `ModelRouterStatus`：给 Web 展示 route、预算和使用量。
- `ModelCallRecord.route/cost/fallback`：把模型调用摘要写入审计记录。

同时给 Agent Run 增加 `modelRoute`，让 Web 发送消息时可以指定 route。

## 2. 在 Model Provider 外包一层 Router

不要把预算逻辑写进具体 provider adapter。P7 新增 `ModelRouter`：

1. 内部持有 primary provider。
2. 维护 cheap/default/reasoning/reviewer 到 provider 的映射。
3. 每次调用前检查预算。
4. provider 成功后记录 usage/cost。
5. provider 失败时按配置 fallback 到 mock。

这样 OpenAI-compatible、DeepSeek-compatible 或未来 provider 都能复用同一层运行时控制。

## 3. Server 注入 Router

Server 不再直接创建裸 provider，而是创建 router：

```ts
const model = createModelRouter({
  provider: config.modelProvider,
  apiKey: config.modelApiKey,
  baseUrl: config.modelBaseUrl,
  model: config.modelName,
  timeoutMs: config.modelTimeoutMs,
  defaultRoute: config.modelDefaultRoute,
  budget: {
    maxTokens: config.modelBudgetMaxTokens,
    maxCostUsd: config.modelBudgetMaxCostUsd,
  },
  fallbackToMock: config.modelFallbackToMock,
});
```

每次 `/api/agent/run` 开始前重置 router usage，这样预算语义是 per-run，而不是 server lifetime。

## 4. Agent Loop 选择 route

Agent Core 调用模型时传入 route：

- 用户在 Web 中选择了 route，就使用用户选择。
- 未选择时，第一轮使用 `default`，后续迭代使用 `cheap`。

模型调用完成后，Agent 把 route、usage、cost、fallback 一起写进 `agent.model_call` 事件。

如果预算超限，Agent 输出错误事件，并以 `budget_exceeded` 结束。

## 5. Web 展示控制面

右侧 AI Chat 上下文区增加一个轻量控制面：

- route 下拉框。
- token/cost 已用量和预算。
- fallback 策略提示。

聊天记录中的模型调用消息现在包含 route、provider/model、状态、耗时、估算成本和 fallback 状态。

## 6. 验证

运行阶段验证命令：

```bash
npm run typecheck
npm run build
git diff --check
```

建议再做三个 smoke：

1. `MODEL_PROVIDER=mock` 能完成一次 Agent Run。
2. 设置很低的 `MODEL_BUDGET_MAX_TOKENS`，第二次模型调用前会停止并显示 `budget_exceeded`。
3. 配置一个不可用的 openai-compatible endpoint，确认 fallback 到 mock。

## 当前限制

- 四个 route 暂时指向同一个 provider。
- 成本是估算值，不是账单。
- reviewer route 还没有独立上下文裁剪策略。
- P7 不处理 secret redaction manifest。
