# 第 4 章：Agent Loop：模型、工具与观察循环

## 本章目标

本章实现最小 Agent Loop。完成后，用户可以在 Web 中输入任务，系统会：

1. 调用 mock model provider。
2. 生成结构化 tool call。
3. 使用 Tool Runner 执行工具。
4. 把 tool result 作为 observation 放回上下文。
5. 下一轮继续调用模型。
6. 输出 final answer。

## 为什么需要 Agent Loop

Tool System 只解决了“动作如何结构化”。Agent Loop 解决的是“动作之后如何继续思考”。

Coding Agent 的基本形态不是一次回答，而是：

```text
model -> tool -> observation -> model -> ...
```

没有这个循环，模型无法根据真实工具结果调整下一步。

## 核心类型

`packages/model-provider`：

- `ModelProvider`
- `MockModelProvider`
- `ModelRequest`
- `ModelResponse`

`packages/agent-core`：

- `runAgentLoop()`
- `AgentLoopOptions`

`packages/shared`：

- `ModelMessage`
- `AgentRunRequest`
- `AgentRunEvent`

## 关键实现

`runAgentLoop()` 做四件事：

1. 初始化 messages。
2. 调用 model provider。
3. 执行 tool calls。
4. 把 tool result 追加为 tool message。

循环由 `maxIterations` 控制。如果模型没有继续给工具调用，或返回 `final: true`，run 就结束。

## Web 效果

右侧 Agent 面板新增任务输入框和“运行最小 Agent Loop”按钮。

底部日志会显示：

- iteration。
- assistant message。
- tool call。
- tool result。
- done。

## 验收方式

运行：

```bash
npm run typecheck
npm run build
```

开发模式下可以检查：

```bash
curl --noproxy '*' -X POST http://127.0.0.1:8787/api/agent/run \
  -H 'Content-Type: application/json' \
  -d '{"message":"查找 formatUser 并读取相关文件"}'
```

应该能看到 SSE 事件中包含 `search_text`、`read_file` 和 `agent.done`。

## 当前局限

- 仍使用 mock provider。
- 还没有真实 LLM function calling。
- 还没有 session state。
- 还不能写文件或运行命令。

这些能力会在后续阶段逐步加入。
