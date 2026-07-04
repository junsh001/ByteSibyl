# Phase 1 设计说明：Web + Server 骨架

## 目标

Phase 1 的目标是建立 Web AI Coding Agent Lab 的产品外壳，而不是实现
agent 能力。用户应该能看到未来 Coding Agent 工作时需要的主要区域：
workspace、editor、agent chat、todo、日志、Trace 占位和 diff approval。

## 边界

本阶段只允许三类行为：

1. Web 渲染 IDE 壳子。
2. Server 返回 health 信息。
3. Server 创建 session，并提供 SSE 事件流占位。

真实 workspace、工具调用、模型循环、patch、approval 和 shell runner 都留给后续
阶段。

## 共享协议

`packages/shared/src/index.ts` 新增 Phase 1 合约：

- `SessionId`
- `HealthResponse`
- `AgentSession`
- `CreateAgentSessionRequest`
- `CreateAgentSessionResponse`
- `WorkspaceFileNode`
- `AgentShellEvent`

这些类型先描述 Web 和 Server 的最小通信面。后续阶段会继续扩展 event，而不是让
Web 直接依赖 Server 内部实现。

## Server 设计

`apps/server/src/index.ts` 保留 Fastify 作为 API 层，提供：

- `GET /api/health`
- `POST /api/sessions`
- `GET /api/sessions/:id`
- `GET /api/sessions/:id/events`

Session 暂时存放在内存 Map 中。这个选择符合 Phase 1：它能验证交互闭环，但不提前
引入持久化 session state。持久化属于 Phase 5。

## Web 设计

`apps/web/src/App.tsx` 直接渲染五区布局：

- 左侧 Workspace 文件树占位。
- 中间 Editor 占位。
- 右侧 Agent Chat 和 Todo Plan。
- 底部 Terminal / Command Log / Trace Log。
- 右下角 Diff Preview + Approval 占位。

点击“创建 Agent Session”会调用 `POST /api/sessions`，随后连接
`GET /api/sessions/:id/events`。事件只用于验证通道，不触发 agent loop。

## 当前限制

- 文件树是静态占位。
- Editor 是代码文本占位，不读写文件。
- Agent Chat 没有输入框和模型调用。
- 日志只显示 session 事件。
- Diff Approval 只是占位。
