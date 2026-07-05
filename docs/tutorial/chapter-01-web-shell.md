# 第 1 章：Web + Server 骨架

## 本章目标

本章实现 Web AI Coding Agent Lab 的第一个可见界面：一个 Web IDE 壳子。它不具备
真正的 agent 能力，但会把未来需要的区域先摆出来，并建立 Web 与 Server 的最小通信。

完成后，用户可以：

- 打开 Web 页面看到五区布局。
- 调用 Server health check。
- 创建一个 Agent Session。
- 看到 session SSE 事件进入日志面板。

## 为什么需要这个模块

Coding Agent 不是只有聊天框。它需要展示文件、编辑器、计划、日志、Trace 占位、diff 和
审批状态。如果一开始只做聊天框，后续接入 workspace、patch 和 approval 时就会不断
推翻 UI 结构。

Phase 1 先搭壳，后续阶段再把真实能力接入这些位置。

## 核心类型

本章在 `packages/shared/src/index.ts` 中定义最小共享协议：

- `SessionId`：session 标识。
- `HealthResponse`：Server health 返回值。
- `AgentSession`：Agent Session 的基础状态。
- `CreateAgentSessionRequest` / `CreateAgentSessionResponse`：创建 session 的请求和响应。
- `WorkspaceFileNode`：未来文件树节点类型。
- `AgentShellEvent`：Phase 1 的事件流类型。

## 关键代码

Server 入口在 `apps/server/src/index.ts`，当前只暴露：

```text
GET  /api/health
POST /api/sessions
GET  /api/sessions/:id
GET  /api/sessions/:id/events
```

Web 入口在 `apps/web/src/App.tsx`。页面分成：

```text
左侧：Workspace 占位
中间：Editor 占位
右侧：Agent Chat + Todo Plan
底部：Terminal / Command Log / Trace Log
弹窗：Diff Preview + Approval 占位
```

## 运行方式

开发模式：

```bash
npm run dev
```

然后打开：

```text
http://localhost:5173
```

## 验收方式

运行：

```bash
npm run typecheck
npm run build
```

再在 Web 页面点击“创建 Agent Session”，底部日志应该显示 `session.created` 和
`session.connected`。

## 当前局限

- 文件树不能读取真实 workspace。
- Editor 不能打开文件。
- Agent Chat 不会调用模型。
- 底部日志不会执行命令。
- Diff Preview 不会展示真实 diff。

这些能力会在 Phase 2 之后逐步接入。

## 下一章要解决什么

第 2 章会实现 Workspace 文件系统，让 Web 能看到真实项目文件，并让后续 agent 拥有
读取项目上下文的基础能力。
