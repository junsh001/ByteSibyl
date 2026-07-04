# 第 13 章：Todo Planner：让 Agent 的计划显式化

前面阶段已经有 Agent Loop、Context Engine、Diagnostics 和工具系统。但用户仍然只能从日志里猜 Agent 当前在做什么。Phase 13 解决这个问题：把任务计划变成显式状态机。

## 1. 学习目标

本章完成：

- 定义 `TodoItem`。
- 新增 `packages/planner`。
- 注册 `todo_write`、`todo_update`、`todo_read` 工具。
- Agent Loop 自动更新 todo 状态。
- Web 展示当前任务计划。

## 2. 为什么 Todo 是状态机

Todo 不只是列表。对 Coding Agent 来说，todo 表达的是任务状态：

```text
pending -> in_progress -> done
                       -> blocked
```

如果一个步骤失败，Agent 不能把它伪装成完成。它必须标记为 `blocked`，并说明原因。

## 3. 定义共享类型

在 `packages/shared` 中新增：

- `TodoStatus`
- `TodoItem`
- `TodoListResponse`
- `agent.todo_updated`

这样 Server、Agent Core、Tool System 和 Web 都使用同一个协议。

## 4. 新增 planner 包

`packages/planner` 提供 `TodoPlanner`。它的职责很窄：

```text
写入计划
读取计划
更新单个 todo 状态
把当前步骤标记 blocked
把所有未阻塞步骤标记 done
```

它不执行命令、不读写 workspace 文件，也不调用模型。

## 5. 接入 Agent Loop

Agent Core 在 run 开始时创建初始计划：

```text
理解任务
构建上下文并选择相关文件
调用模型决定下一步工具动作
执行工具并读取 observation
完成总结或标记 blocked
```

之后每个阶段转换都会发出 `agent.todo_updated` 事件。Web 和 session log 都能看到这些变化。

## 6. 注册 todo 工具

Tool System 注册三个工具：

- `todo_write`
- `todo_update`
- `todo_read`

它们都是 `read_only`，因为只影响 Agent 的计划状态，不影响 workspace。

## 7. Web 展示

Web 新增 `apps/web/src/features/todo-panel`。它只渲染状态，不推断状态：

- `pending`
- `in_progress`
- `done`
- `blocked`

运行 Agent Loop 后，右侧面板会出现 Todo Planner 区块，当前步骤会以 `in_progress` 显示。

## 8. 验证

运行：

```bash
npm run typecheck
npm run build
```

启动 Server 后检查：

```bash
curl http://127.0.0.1:8787/api/tools
```

工具列表应包含：

```text
todo_write
todo_update
todo_read
```

再运行 Agent Loop，SSE 中应出现 `agent.todo_updated`。

## 9. 当前局限

当前 planner 是单进程教学实现。它能展示一个 Agent run 的状态转换，但没有做跨 run 持久 todo、并发隔离、多 agent 分工或长期后台任务。

这些能力属于后续工程化阶段。
