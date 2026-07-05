# Phase 16 Trace、Replay 与 Observability 设计说明

## 背景

前面阶段已经产生了大量运行数据：Agent Run steps、模型调用、工具结果、Patch Proposal、审批、命令结果和 Hooks。Phase 16 不重新设计执行流程，而是把这些离散记录统一为可复盘的 Trace。

## 包边界

`packages/shared` 定义跨 Web、Server、Telemetry 使用的 Trace contract：

- `TraceTimelineEntry`
- `ModelCallTrace`
- `ToolCallTrace`
- `FileEditTrace`
- `CommandTrace`
- `ApprovalTrace`
- `SessionTraceExport`

`packages/telemetry` 负责把 Session Store 中已有数据转换为 `SessionTraceExport`。Web 只渲染 Server 返回的结构，不直接拼接后端内部状态。

## Trace 组装

`SessionStore.getSessionTrace(sessionId)` 会读取同一个 Session 的：

- runs 和 steps
- model calls
- tool calls 和 tool results
- patch proposals
- command results
- approvals
- hooks

然后按 timestamp 排序生成 `timeline`。每条 timeline entry 都有：

- `kind`：记录类型，例如 `model_call`、`file_edit`、`command`。
- `title`：短标题。
- `summary`：可扫描摘要。
- `status`：完成、失败、审批状态或 Hook 状态。
- `data`：原始结构化 trace 数据。

## 文件修改证据

当前 Patch Proposal 没有保存完整原始文件内容，因此 Phase 16 使用 patch hunk 作为前后证据：

- `before.sample` 来自 context/remove lines。
- `after.sample` 来自 context/add lines。
- `unifiedDiff` 保留完整 diff 证据。
- `oldLineCount` 和 `newLineCount` 映射到前后行数。

这满足“每次文件修改都有前后证据”的教学目标，同时避免把完整文件快照重复写入 session log。

## 命令证据

`CommandTrace` 保留：

- command 和 argv
- cwd
- safety
- status
- exitCode
- durationMs
- stdout/stderr 摘要

Web 的 Trace Detail 会明确展示 exit code，底层完整 stdout/stderr 仍在 Session Log 的 command result 中。

## Web Replay

`apps/web/src/features/trace-viewer` 提供一个轻量 Session Replay 视图：

- 统计 model、tools、files、commands、approvals 数量。
- 用时间线列出所有 trace event。
- 用“上一步 / 下一步”在 timeline 中步进。
- 选中 file edit 时显示 before/after evidence。
- 选中 command 时显示 exit code 和 duration。
- 导出当前 Session 的 trace JSON。

## 当前边界

本阶段不接入 OpenTelemetry，不实现 Eval，不做跨 Session 对比，也不新增数据库。Trace 来源是当前 `SessionStore` 已持久化的数据，重点是教学可见性和可导出复盘。
