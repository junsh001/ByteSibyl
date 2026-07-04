# Phase 5 Design: Session State 与长任务控制

## 背景

Phase 4 的 Agent Loop 已经能完成 model、tool call、tool result、final answer 的最小闭环，
但它仍然像一次 HTTP 请求：请求结束后，运行过程只存在于浏览器内存中。Phase 5 的目标是让
Server 成为 Session 和 Run 的状态拥有者。

## 状态模型

Phase 5 定义两层状态：

- `AgentSession`：用户视角的一次工作上下文。
- `AgentRunRecord`：一次具体 Agent Loop 执行。

Session 和 Run 都使用同一组主要状态：

```text
created -> running -> completed
created -> running -> cancelled
created -> running -> failed
```

`paused` 和 `waiting_approval` 已进入共享契约，但 Phase 5 不触发它们。它们是后续
Guardrails 和 Human-in-the-loop 阶段的状态占位，当前实现不会提前接入 approval。

## Step Log

每个 run 会记录两类信息：

- `events`：原始 SSE 事件，供 Web 实时渲染。
- `steps`：按教学视角归类后的运行步骤，例如 `model_call`、`tool_call`、`tool_result`、
  `final` 和 `error`。

这种拆分让 UI 可以继续使用事件流，同时也让教程能讲清楚 Agent Loop 的可观察状态。

## 持久化策略

`packages/telemetry` 提供 `SessionStore`。它是一个最小文件型存储：

- 进程启动时读取 `data/session-log.json`。
- Session、Run、Event、Step 变化后写回 JSON。
- 使用临时文件再 rename，避免写到一半留下损坏文件。

Phase 5 不引入数据库，也不实现 trace replay。这个选择保持代码可读，便于学习状态机和运行日志。

## 长任务控制

Server 为每个活跃 run 创建一个 `AbortController`。Web 调用
`POST /api/agent/runs/:runId/cancel` 后，Server abort 当前 run。Agent Core 在 iteration 和
tool call 边界检查 `AbortSignal`，然后用 `agent.done(cancelled)` 收束。

取消是协作式的，不会强杀进程。当前阶段没有 shell runner，因此不存在需要终止子进程的问题。

## API

- `POST /api/sessions`：创建 Session。
- `GET /api/sessions/:id`：读取 Session。
- `GET /api/sessions/:id/log`：读取 Session 和历史 runs。
- `POST /api/agent/run`：创建 Run 并用 SSE 返回执行事件。
- `POST /api/agent/runs/:runId/cancel`：取消活跃 Run。

## 边界

Agent Core 不依赖 Web UI，也不负责持久化。Server 负责把 Agent Core 的事件转成 session log。
`packages/shared` 只保存跨层 DTO，不引入运行时依赖。
