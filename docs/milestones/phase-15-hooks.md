# Phase 15: Hooks

## 目标

引入确定性的 Hooks 系统，在模型输出之外拦截关键边界：工具调用、文件编辑和命令执行。Hooks 的职责是让 Agent 行为受运行时规则约束，而不是只依赖 prompt 中的自我约束。

## 允许范围

- 新增 `packages/hooks`。
- 定义 Hook Registry 与 Hook 执行结果。
- 支持以下 Hook phase：
  - `onSessionStart`
  - `beforeToolCall`
  - `afterToolCall`
  - `beforeFileEdit`
  - `afterFileEdit`
  - `beforeCommandRun`
  - `afterCommandRun`
  - `onAgentStop`
- `beforeToolCall` 可以拒绝直接 mutation 类工具。
- `beforeFileEdit` 可以阻止修改 `.env` 和 `.env.*`。
- `afterCommandRun` 记录 stdout/stderr 摘要。
- Hook 结果写入 Session Trace。
- Web 展示 Hook 计数、阻断数量和最近 Hook Trace。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 MCP。
- 不实现 subagents。
- 不实现远程 Hook marketplace。
- 不实现用户自定义脚本 Hook。
- 不放宽 Permission、Approval、Shell Runner 或 Patch Engine 的边界。
- 不让 Hook 直接替代审批流程。

## 必需产物

- `packages/hooks`
- `packages/shared/src/index.ts`
- `packages/telemetry/src/index.ts`
- `packages/tool-system/src/index.ts`
- `apps/server/src/index.ts`
- `apps/server/src/routes/agent.ts`
- `apps/server/src/routes/patches.ts`
- `apps/server/src/routes/shell.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/index.css`
- `docs/design/phase-15-hooks.md`
- `docs/tutorial/chapter-15-hooks.md`
- `docs/blog/15-hooks-are-deterministic-agent-control.md`

## 验收标准

1. 尝试修改 `.env` 会被 `beforeFileEdit` Hook 阻止。
2. 命令执行后会记录 stdout/stderr 摘要。
3. Hook 自身失败不会中断 Session。
4. Hook 记录会进入 Session Trace。
5. Web 可以显示 Hook 总数、阻断数量和最近 Hook 记录。
6. 前端界面变化必须在总结中说明。

## 验证命令

```bash
npm run typecheck
npm run build
```
