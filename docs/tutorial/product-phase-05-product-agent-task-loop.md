# Product Phase 05 教程：把 Agent Run 包装成可恢复任务

P5 的目标是获得 Codex IDE 插件式体验：用户发送消息，系统把工具调用、模型调用、命令和审批都输出到聊天框。

## 1. 新增 ProductTask

在 shared contracts 中新增 `ProductTask` 和 `ProductTaskMessage`。

## 2. Server 创建或复用 Task

`POST /api/agent/run` 如果没有 `taskId`，就创建新 task；如果有未完成 task，则继续写入该 task。

## 3. 记录消息

Agent event 被转换为 task message：

- `agent.message` -> assistant。
- `agent.status` -> status。
- `agent.tool_call` / `agent.tool_result` -> tool。
- command route -> command。
- approval action -> approval。

## 4. Web 恢复聊天

刷新后前端读取 session log，从 `tasks.messages` 恢复聊天记录。如果旧日志没有 task，则回退到 run events 重建。

## 5. 折叠非核心区域

Diff Preview 默认折叠，避免影响聊天主内容。用户需要 review 时再展开。

## 验证

运行：

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

## 边界

P5 不实现后台队列、不实现多文件批量 apply、不实现用户可编辑 planner。
