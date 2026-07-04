# 第 10 章：Model Provider Integration

本章把 Agent Loop 从纯 mock provider 扩展到可配置的真实模型 provider。目标不是让模型拥有更多
权限，而是把模型接入放进已有边界里：Tool System 仍校验工具调用，Patch 仍需要 Approval，Shell
仍走 guardrails。

## 1. 扩展共享契约

在 `packages/shared` 中新增：

- `ModelProviderInfo`
- `ModelProviderStatusResponse`
- `ModelUsage`
- `ModelCallRecord`

`SessionLogResponse` 增加 `modelCalls`，用于让 Web 看到每次模型调用的摘要。

## 2. 实现 OpenAI-compatible provider

在 `packages/model-provider` 中保留 `MockModelProvider`，再新增 `OpenAICompatibleModelProvider`。

Provider 接收：

```text
apiKey
baseUrl
model
timeoutMs
```

真实请求发送到：

```text
/v1/chat/completions
```

返回里的 tool calls 会被解析成项目已有的 `ToolCallRequest`。如果 API key 缺失、HTTP 失败、超时或返回
空 choices，provider 会抛出清晰的 `ModelProviderError`。

## 3. Server 选择 provider

`apps/server/src/config.ts` 从环境变量读取 provider 配置。

默认：

```text
MODEL_PROVIDER=mock
```

真实模型示例：

```text
MODEL_PROVIDER=deepseek
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
MODEL_TIMEOUT_MS=30000
```

Server 用 `createModelProvider()` 创建 provider，并通过：

```text
GET /api/model-provider/status
```

返回 provider 状态。这个接口不会返回 API key。

## 4. 记录 model call

`agent-core` 在每次 `model.complete()` 前后记录耗时。成功时发出 `agent.model_call`，包含 usage 和 response
摘要；失败或超时时也发出 `agent.model_call`，并随后输出 `agent.error` 和 `agent.done`。

Server 将 model call 绑定到当前 session/run 后写入 `SessionStore`。

## 5. Web 展示 provider 状态

Web 启动时读取 provider status，并在 Agent Chat 中展示：

- Provider
- Model
- Status
- 配置说明

Session State 显示 `Model calls` 计数，底部日志展示最近模型调用。

## 6. 验证

运行：

```bash
npm run typecheck
npm run build
```

默认 mock provider 不需要网络或 API key。配置真实 provider 后，可以通过 Web 运行 Agent Loop 验证真实模型调用。
