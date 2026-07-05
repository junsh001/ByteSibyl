# Phase 10 设计：Model Provider Integration

Phase 10 把 Phase 4 的 `MockModelProvider` 扩展成可配置 provider。默认仍使用 mock，配置环境变量后
Server 可以调用 OpenAI-compatible chat completions API。这个阶段只接入模型调用，不改变工具、
Patch、Shell 和 Approval 的确定性边界。

## 配置

Server 从环境变量读取配置：

- `MODEL_PROVIDER` 或 `WAC_MODEL_PROVIDER`：`mock`、`openai-compatible`、`openai` 或 `deepseek`。
- `MODEL_API_KEY`、`OPENAI_API_KEY`、`DEEPSEEK_API_KEY` 或 `deepseek_KEY`。
- `MODEL_BASE_URL`、`OPENAI_BASE_URL` 或 `DEEPSEEK_BASE_URL`，默认 `https://api.deepseek.com`。
- `MODEL_NAME` 或 `DEEPSEEK_MODEL`，默认 `deepseek-chat`。
- `MODEL_TIMEOUT_MS`，默认 `30000`。

API key 只在 Server 读取，不进入 Web bundle，也不会通过 status API 返回。

## Provider 边界

`packages/model-provider` 暴露：

- `MockModelProvider`
- `OpenAICompatibleModelProvider`
- `createModelProvider()`
- `ModelProviderError`

真实 provider 调用 `/v1/chat/completions`，把当前 `ModelRequest` 转换成 chat messages 和 function
tools。tool calls 会被解析成项目已有的 `ToolCallRequest`，再交给 Agent Loop 和 Tool System。

模型不能直接读文件、写文件或执行命令。它只能返回结构化 tool call；工具执行仍由 Tool Registry、
Permission、Patch Approval 和 Shell Runner 控制。

## Model Call 记录

Agent Loop 每次调用模型后会发出 `agent.model_call` 事件，并记录：

- provider
- model
- status
- latencyMs
- usage
- requestSummary
- responseSummary
- error

`SessionStore` 会把这些记录持久化到 `modelCalls`，`SessionLogResponse` 返回给 Web。

## 前端界面变化

Agent Chat 右侧新增 `Model Provider` 面板：

- 展示 provider 类型。
- 展示模型名。
- 展示 provider status。
- 展示 Server 返回的配置说明。

Session State 增加 `Model calls` 计数，底部日志显示最近 model call 的 provider、model、状态和耗时。

## 不做什么

本阶段不实现 Context Engine、LSP Diagnostics、自动安装依赖、多 provider 路由、成本优化、批量
Eval，也不允许模型绕过已有安全边界。
