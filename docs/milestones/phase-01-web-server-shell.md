# Phase 1: Web + Server 骨架

## 目标

搭建 Web AI Coding Agent Lab 的最小产品壳子。这个阶段只做可视化布局、
health check、session 创建接口和事件流占位，为后续 workspace、tool
system 和 agent loop 留出位置。

## 允许范围

- `apps/web` 中实现五区 Web IDE 布局占位。
- `apps/server` 中实现 health check。
- `apps/server` 中实现 agent session 创建接口。
- `apps/server` 中实现 SSE 事件流占位。
- `packages/shared` 中定义 Phase 1 需要的 SessionId、AgentSession、
  AgentShellEvent、WorkspaceFileNode 等共享类型。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现真实文件读写。
- 不实现 workspace 搜索。
- 不实现 agent loop。
- 不接入模型 provider。
- 不执行 shell 命令。
- 不生成或应用 patch。
- 不实现 approval/guardrails。
- 不新增生产依赖。

## 必需产物

- `packages/shared/src/index.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/index.css`
- `docs/design/phase-01-web-server-shell.md`
- `docs/tutorial/chapter-01-web-shell.md`
- `docs/blog/01-web-ai-coding-shell.md`

## 验收标准

1. Web 页面显示 Workspace、Editor、Agent Chat + Todo、底部日志、Diff
   Preview + Approval 占位。
2. `GET /api/health` 返回 Phase 1 health 信息。
3. `POST /api/sessions` 可以创建 session。
4. `GET /api/sessions/:id/events` 可以返回 SSE 事件。
5. shared 包定义本阶段前后端共享类型。
6. 没有新增真实文件读写、命令执行、patch 或 agent loop 行为。

## 验证命令

```bash
npm run typecheck
npm run build
```

