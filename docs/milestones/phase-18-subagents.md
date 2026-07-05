# Phase 18: Subagents

## 目标

在单 Agent 内核稳定后，加入最小多角色机制：planner、coder、reviewer。每个 subagent 有独立 system prompt、独立权限和独立职责，主 session 只接收 subagent summary。

## 允许范围

- 新增 `packages/subagents`。
- 定义 planner、coder、reviewer 三个角色。
- 为每个角色定义 system prompt、职责和权限。
- planner/reviewer 默认 `read_only`。
- coder 使用 `write_patch_with_approval`，只能准备 Patch Proposal，apply patch 仍需要 approval。
- Agent Loop 开始时生成 `agent.subagent_summary` 事件。
- Server 暴露 `/api/subagents`。
- Web 展示 subagent 角色、权限和最近 summary。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现远程 subagent。
- 不实现并行多 Agent 执行。
- 不让 subagent 绕过 Tool System、Permission、Approval、Shell Runner、Hooks。
- 不给 planner/reviewer 写文件能力。
- 不让 reviewer 执行危险命令。
- 不让 subagent 的完整上下文污染主 session。

## 必需产物

- `packages/subagents`
- `packages/shared/src/index.ts`
- `packages/agent-core/src/index.ts`
- `apps/server/src/index.ts`
- `apps/server/src/routes/agent.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/index.css`
- `docs/design/phase-18-subagents.md`
- `docs/tutorial/chapter-18-subagents.md`
- `docs/blog/18-small-focused-agents.md`

## 验收标准

1. planner 不可写文件。
2. reviewer 不可执行危险命令。
3. coder 修改后 reviewer 能审查 diff。
4. subagent 上下文不污染主 session，只写入 summary。
5. 前端界面变化必须在总结中说明。

## 验证命令

```bash
npm run typecheck
npm run build
```
