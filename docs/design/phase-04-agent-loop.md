# Phase 4 设计说明：Agent Loop 最小实现

## 目标

Phase 4 实现最小 Agent Loop：模型提出结构化工具调用，Tool Runner 执行工具，工具结果作为
observation 回到模型上下文，最后模型输出 final answer。

本阶段使用 mock model provider，不接真实模型 API。

## 模块边界

新增两个包：

- `packages/model-provider`：模型抽象和 mock provider。
- `packages/agent-core`：Agent Loop、iteration、tool call、observation 和 stop condition。

`agent-core` 依赖 `model-provider`、`tool-system` 和 `shared`，不依赖 Web UI。

## Loop 流程

```text
user message
  -> model.complete(messages, tools)
  -> assistant message
  -> tool calls
  -> ToolRunner.run()
  -> tool result observation
  -> append tool message
  -> next iteration
  -> final / maxIterations
```

## Mock Provider

`MockModelProvider` 的目标是教学和验证：

- 第一轮根据用户输入选择 `search_text` 或 `get_workspace_tree`。
- 如果搜索命中文件，第二轮调用 `read_file`。
- 读取文件后输出 final answer。

这样不需要 API key，也能演示完整的模型、工具、观察循环。

## Server API

`apps/server/src/routes/agent.ts` 暴露：

```text
POST /api/agent/run
```

返回 SSE 事件：

- `agent.status`
- `agent.iteration`
- `agent.message`
- `agent.tool_call`
- `agent.tool_result`
- `agent.error`
- `agent.done`

## 当前限制

- 没有真实模型。
- 没有 durable session。
- 没有取消、暂停、approval。
- 没有写文件和 shell。
- observation 只保存在本次 run 的内存 messages 中。
