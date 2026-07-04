# 第 5 章：Session State 与长任务控制

本章把最小 Agent Loop 改造成可观察、可取消、可恢复查看日志的运行单元。目标不是实现完整
Trace 系统，而是让每一次 run 都有明确归属和状态记录。

## 1. 定义共享状态契约

先在 `packages/shared` 中补齐 Session、Run 和 Step 类型：

- `AgentSessionStatus`
- `AgentRunStatus`
- `AgentRunRecord`
- `AgentRunStep`
- `SessionLogResponse`

Session 表示用户的一次工作上下文，Run 表示一次 Agent Loop 执行，Step 表示教学视角下的关键
步骤。Phase 5 已经把 `paused` 和 `waiting_approval` 写入契约，但当前实现不会触发它们。

## 2. 新增 SessionStore

新增 `packages/telemetry`，实现一个轻量 `SessionStore`：

1. 启动时读取 `data/session-log.json`。
2. 创建 Session 时写入状态。
3. 创建 Run 时绑定 Session。
4. 每个 SSE event 都追加到 run events。
5. 每个 event 同时转换成一个 Step。
6. 每次变化后保存 JSON。

这里没有使用数据库，是为了让学习者直接看到持久化数据结构。

## 3. 让 Agent Loop 支持取消

`packages/agent-core` 的 `runAgentLoop()` 接受 `AbortSignal`。循环会在 iteration 和 tool call
边界检查 signal：

```text
running -> agent.done(cancelled)
```

这是一种协作式取消。Agent Core 不知道 HTTP、不知道浏览器，也不写日志；它只负责在合适位置
停止循环。

## 4. Server 管理 run lifecycle

Server 在 `/api/agent/run` 中做四件事：

1. 找到或创建 Session。
2. 创建 Run。
3. 为 Run 创建 `AbortController`。
4. 流式执行 Agent Loop，并把每个事件写入 `SessionStore`。

当 Web 请求 `/api/agent/runs/:runId/cancel` 时，Server 找到活跃 controller 并调用
`abort()`。Agent Loop 收到 signal 后结束，Server 把 Run 和 Session 标记为 `cancelled`。

## 5. Web 展示状态

前端新增了一个 `Session State` 区块：

- 当前 Session 状态。
- 当前 Run id。
- 已持久化 run 数量。
- 刷新 Session Log 的按钮。
- 取消当前 Run 的按钮。

底部日志面板继续显示实时 SSE 事件，同时也显示最近持久化的 Step，帮助学习者比较“实时事件”
和“落盘状态”的区别。

## 6. 验证

运行：

```bash
npm run typecheck
npm run build
```

然后启动服务，创建 Session，运行 Agent Loop。完成后刷新 Session Log，应该能看到 run 和 step。
运行过程中点击取消，run 应该以 `cancelled` 结束。

## 本章边界

本章不实现 patch、approval、shell runner、真实模型或 trace replay。Session State 的作用是为
这些后续能力提供可追踪的运行基础。
