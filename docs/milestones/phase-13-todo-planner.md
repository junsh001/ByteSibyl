# Phase 13: Todo Planner

## 目标

让 Agent 的任务计划显式化，把“正在做什么、做完了什么、哪里 blocked”变成可观察状态。

## 允许范围

- 新增 `packages/planner`。
- 定义 `TodoItem`：`pending`、`in_progress`、`done`、`blocked`。
- 注册结构化工具 `todo_write`、`todo_update`、`todo_read`。
- Agent Loop 在 run 开始前创建计划，并在上下文构建、模型调用、工具执行、完成或阻塞时更新 todo。
- Web 通过 `apps/web/src/features/todo-panel` 展示 todo 状态列表。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 Skills、Hooks、Trace Replay 或 Eval。
- 不实现多 agent planner/coder/reviewer。
- 不实现长期任务后台执行。
- 不新增 shell 权限或放宽 command guardrails。
- 不让 todo 状态绕过 Tool System、Patch Approval 或 Permission。
- 不把 todo planner 做成前端私有状态机。

## 必需产物

- `packages/planner`
- `packages/shared/src/index.ts`
- `packages/agent-core/src/index.ts`
- `packages/tool-system/src/index.ts`
- `apps/server/src/index.ts`
- `apps/server/src/routes/todos.ts`
- `apps/web/src/features/todo-panel`
- `apps/web/src/App.tsx`
- `docs/design/phase-13-todo-planner.md`
- `docs/tutorial/chapter-13-todo-planner.md`
- `docs/blog/13-todo-is-agent-state-machine.md`

## 验收标准

1. Agent 执行任务前创建 plan。
2. 当前步骤可见。
3. 完成后标记 `done`。
4. 阻塞时使用 `blocked`，不会伪装成功。
5. Web 可以展示当前 todo 列表。
6. `todo_write`、`todo_update`、`todo_read` 出现在工具列表中。
7. 前端界面变化必须在总结中说明。

## 验证命令

```bash
npm run typecheck
npm run build
```
