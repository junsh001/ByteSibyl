# Phase 13 设计说明：Todo Planner

Phase 13 把 Agent 的任务进度从隐式日志变成显式状态机。Todo Planner 不负责推理、不执行命令、不修改文件；它只表达当前任务计划和状态迁移。

## 架构

新增 `packages/planner`，提供 `TodoPlanner`：

- `createInitialPlan(task)`
- `writeTodos(titles)`
- `readTodos()`
- `updateTodo(id, status, detail)`
- `startStep(match)`
- `completeStep(match)`
- `blockCurrent(reason)`
- `completeAll(detail)`

`packages/shared` 定义 `TodoItem`、`TodoStatus`、`TodoListResponse` 和 `agent.todo_updated` 事件。

Agent Core 在 run 生命周期中更新 todo：

```text
run created -> createInitialPlan
iteration -> 理解任务 done，构建上下文 in_progress
context summary -> 构建上下文 done，调用模型 in_progress
model returned -> 调用模型 done
tool call -> 执行工具 in_progress
tool result -> 执行工具 done 或 blocked
final -> completeAll
error/max_iterations -> blockCurrent
```

Tool System 同时注册：

- `todo_write`
- `todo_update`
- `todo_read`

这些工具是 `read_only`，因为它们只更新 Agent 的内部计划状态，不写 workspace 文件。

## Web 展示

Web 新增 `apps/web/src/features/todo-panel`，只负责渲染 todo 状态。状态来源有两类：

- `/api/todos` 初始读取当前 planner 状态。
- Agent SSE 中的 `agent.todo_updated` 事件实时更新列表。

Web 不决定状态迁移，也不推断任务是否成功。

## 当前边界

本阶段没有实现复杂 planner 推理、长期任务、跨 session 持久 todo 或多 agent 分工。当前 planner 是教学用单进程状态机，适合观察 Agent run 内部阶段转换。

并发多个 Agent run 时，todo 状态会被最近 run 覆盖；并发隔离留到后续工程化阶段。

## 前端变化

Agent 侧栏新增 `Todo Planner` 面板，展示 `pending`、`in_progress`、`done`、`blocked` 状态。Session State 增加 todo 数量，底部日志展示 `todo_updated` 事件。
