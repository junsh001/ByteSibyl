# Phase 15 Hooks 设计说明

## 背景

Prompt 可以告诉模型不要做危险操作，但 prompt 不是执行时边界。Phase 15 引入 Hooks，把部分控制逻辑放到确定性的 TypeScript 运行时中：模型可以提出工具调用、Patch 或命令，但关键动作会先经过 Hook Registry。

## 包边界

`packages/hooks` 是独立 agent kernel 包，不依赖 Web UI。它只依赖 `packages/shared` 中的共享 contract。

本阶段接入点如下：

- `packages/tool-system` 在工具运行前调用 `beforeToolCall`，运行后调用 `afterToolCall`。
- `apps/server/src/routes/patches.ts` 在生成 Diff Preview 和应用 Patch 前调用 `beforeFileEdit`，写入成功后调用 `afterFileEdit`。
- `apps/server/src/routes/shell.ts` 在 Shell Runner 前后调用 `beforeCommandRun` 和 `afterCommandRun`。
- `apps/server/src/index.ts` 在创建 Session 后调用 `onSessionStart`。
- `apps/server/src/routes/agent.ts` 在 Agent Loop 结束时调用 `onAgentStop`。
- `packages/telemetry` 持久化 `HookRecord`，并通过 Session Log 返回给 Web。

## Hook Record

Hook 结果使用 `HookRecord` 表示，包含：

- `phase`：Hook phase。
- `hookName`：具体 Hook 名称。
- `status`：`passed`、`blocked` 或 `error`。
- `subject`：被检查对象，例如文件路径、命令或工具名。
- `message`：面向 trace 的说明。
- `summary`：可选摘要，例如命令 stdout/stderr 压缩结果。

## 当前 Hook

`block-direct-mutation-tools` 在 `beforeToolCall` 中阻止直接 mutation 类工具名，避免 Tool System 被新增危险工具绕开。当前阻止 `write_file`、`apply_patch`、`execute_command` 和 `run_shell`。

`block-sensitive-file-edit` 在 `beforeFileEdit` 中阻止 `.env` 与 `.env.*` 文件编辑。检查发生在读取原文件前，因此即使 `.env` 不存在，也会先被 Hook 拦截。

`summarize-command-output` 在 `afterCommandRun` 中压缩 stdout/stderr，把命令结果摘要写入 trace，方便后续 Context Engine 或 Trace UI 使用。

`record-session-start` 和 `record-agent-stop` 记录 Session 创建与 Agent 停止生命周期，让 Hook Trace 覆盖一次 Agent Run 的开始和结束。

## 失败隔离

Hook Registry 使用 `safeRecord` 包装 Hook 执行。Hook 抛错时会生成 `status: "error"` 的记录，但 `blocked` 为 `false`，因此 Hook 自身失败不会让 Session 崩溃。

这不是忽略安全检查。安全边界仍由 Permission、Approval、Guardrails 和 Shell Runner 负责；Hooks 是确定性拦截和观测层。

## Web 变化

Web 右侧 Agent 面板新增 Hooks 区块，展示 Hook 总数、阻断数量和最近记录。Session State 增加 Hooks 计数，底部 Trace Log 会显示最近 Hook 详情，包括 `phase`、`hookName`、`status`、`subject` 和命令输出摘要。

## 当前边界

本阶段只实现内置 Hook Registry，不支持用户在 UI 中动态配置 Hook，也不执行外部 Hook 脚本。生命周期 Hook 已覆盖 Session 创建和 Agent 停止，后续阶段可以继续扩展更多运行时入口。
