# Phase 17 Evaluation 设计说明

## 背景

Trace 让 Agent 行为可复盘，但要判断 Agent 是否真的有效，还需要可重复运行的 Eval。Phase 17 的目标是建立任务格式、批量 runner 和 JSON report。

本阶段不追求完整自动修复 benchmark，也不实现远程排行榜。它提供本地、教学导向的评测基础。

## 任务格式

Eval task 使用 JSON：

```json
{
  "id": "ts-typecheck-001",
  "workspace": "examples/buggy-ts-project",
  "prompt": "Fix the TypeScript typecheck error.",
  "successCommands": ["npm run typecheck"],
  "forbiddenFiles": ["package.json"],
  "maxChangedFiles": 3
}
```

字段含义：

- `workspace`：任务工作区。
- `prompt`：要评测的任务描述。
- `successCommands`：成功标准命令。
- `forbiddenFiles`：不允许修改的文件。
- `maxChangedFiles`：最大允许变更文件数。

## 包边界

`packages/eval` 负责：

- 加载任务 JSON。
- 解析和校验任务结构。
- 批量运行任务。
- 通过 Shell Runner 执行 success commands。
- 对 workspace 做前后快照。
- 检测 changed files 和 forbidden files。
- 生成 `EvalReport`。

`packages/shared` 定义 `EvalTask`、`EvalTaskResult`、`EvalReport` 等跨层 contract。

`scripts/eval/run.ts` 是 CLI 入口，只负责加载任务目录、调用 `packages/eval` 并输出 JSON。

## 指标

报告包含：

- `success_rate`
- `changed_files_count`
- `command_count`
- `tool_call_count`
- `approval_count`
- `runtime_seconds`
- `forbidden_action_count`

当前 runner 不驱动 Agent 自动修复，所以 `tool_call_count` 和 `approval_count` 为 0。后续可以把 Trace Replay 输出接入 Eval，得到真实工具调用和审批指标。

## Web 变化

Web 右侧 Agent 面板新增 Evaluation 区块：

- 显示任务数量。
- 可运行 eval。
- 显示 pass 数、success rate、forbidden action count。
- 展示前 5 个任务结果摘要。

Web API 对应：

- `GET /api/eval/tasks`
- `POST /api/eval/run`

## 安全边界

Eval runner 执行命令时使用 `ShellRunner`，因此仍然受 safe command 白名单和 permission policy 限制。本阶段不会直接调用 shell 执行任意命令。

## 当前边界

Phase 17 的 Eval 是本地任务 runner，不会自动调用模型完成任务，也不会创建远程 benchmark。它建立可重复的任务定义、指标和 report，为后续更完整的 Agent 评测打基础。
