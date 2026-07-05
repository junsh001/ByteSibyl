# 第 16 章：Trace 与 Replay

本章把已有的 Session Log 变成可观察、可复盘、可导出的 Trace。

## 1. 定义 Trace Contract

先在 `packages/shared` 中定义 Trace 结构。核心类型是 `TraceTimelineEntry`：

```ts
export interface TraceTimelineEntry {
  id: string;
  sessionId: SessionId;
  runId?: AgentRunId;
  kind: TraceEntryKind;
  title: string;
  summary: string;
  status?: string;
  refId?: string;
  timestamp: string;
  data: unknown;
}
```

它不是替代原始记录，而是给 Web 提供统一时间线。原始记录会保存在 `data` 中。

本阶段还定义了：

- `ModelCallTrace`
- `ToolCallTrace`
- `FileEditTrace`
- `CommandTrace`
- `ApprovalTrace`
- `SessionTraceExport`

## 2. 在 Telemetry 中组装 Trace

`packages/telemetry` 已经保存 Session 的 runs、patches、approvals、commands、modelCalls 和 hooks。我们新增 `getSessionTrace(sessionId)`，从这些数据生成统一导出结构：

```ts
const trace = sessionStore.getSessionTrace(sessionId);
```

组装逻辑分成两层：

- 先把每类原始数据转换成专门 trace，例如 `CommandTrace`。
- 再把这些 trace 转成 `TraceTimelineEntry` 并按时间排序。

这样 Web 可以按 timeline 渲染，导出的 JSON 仍然保留各类结构化数据。

## 3. 文件修改前后证据

Patch Proposal 中已有 hunks、additions、deletions、line count 和 unified diff。Phase 16 使用这些信息生成 `FileEditTrace`：

- `before.sample`：context/remove lines。
- `after.sample`：context/add lines。
- `unifiedDiff`：完整 diff 证据。
- `before.lineCount` / `after.lineCount`：修改前后行数。

这避免重复保存完整文件快照，也能让学习者看到每次文件修改的前后依据。

## 4. 命令 Trace

Shell Runner 已保存命令结果。`CommandTrace` 保留：

- command
- argv
- cwd
- safety
- status
- exitCode
- durationMs
- stdout/stderr 摘要

验收时重点检查：每次命令都能在 Trace Detail 中看到 exit code。

## 5. 新增 Server 端点

在 Server 中新增：

```text
GET /api/sessions/:id/trace
```

它返回 `SessionTraceExport`。如果 Session 不存在，返回 404。

## 6. 新增 Trace Viewer

前端新增：

```text
apps/web/src/features/trace-viewer/index.tsx
```

它展示：

- trace 统计。
- timeline。
- 上一步 / 下一步 replay 控制。
- 选中事件详情。
- 文件 before/after evidence。
- 命令 exit code。
- 导出 JSON 按钮。

主界面刷新 Session Log 时，同时请求 Session Trace：

```ts
const [logResult, traceResult] = await Promise.all([
  api.sessionLog(session.id),
  api.sessionTrace(session.id),
]);
```

## 7. 验证

运行：

```bash
npm run typecheck
npm run build
```

然后启动服务做烟测：

1. 创建 Session。
2. 执行安全命令。
3. 读取 `/api/sessions/:id/trace`。
4. 确认 timeline 中存在 `command`，且 `data.exitCode` 有值。
5. 在 Web 中刷新 Session Log，Trace Replay 应显示事件并能导出 JSON。

## 小结

Phase 16 的关键不是新增 Agent 能力，而是让 Agent 已经做过的事情能被复盘。Trace 是后续 Evaluation 的基础，但本阶段只实现可观察性和 replay，不进入评测。
