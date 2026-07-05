# Phase 16: Trace、Replay 与 Observability

## 目标

让 Agent 行为可观察、可复盘、可导出。Phase 16 将已有 Session Log 中的模型调用、工具调用、文件编辑、命令、审批和 Hook 记录统一成时间线 Trace。

## 允许范围

- 扩展 `packages/telemetry`，从已有持久化数据生成 `SessionTraceExport`。
- 在 `packages/shared` 中定义 Trace contract。
- 新增 `/api/sessions/:id/trace` 端点。
- 新增 `apps/web/src/features/trace-viewer`。
- Web 展示 Session Replay 时间线。
- Web 展示文件修改前后证据。
- Web 展示命令 exit code。
- Web 支持导出 session trace JSON。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 Phase 17 Evaluation。
- 不新增 eval task runner。
- 不实现 OpenTelemetry、外部 APM 或分布式 tracing。
- 不新增数据库。
- 不改变 Agent Loop 决策逻辑。
- 不绕过 Permission、Approval、Shell Runner、Hooks。

## 必需产物

- `packages/shared/src/index.ts`
- `packages/telemetry/src/index.ts`
- `apps/server/src/index.ts`
- `apps/web/src/api.ts`
- `apps/web/src/features/trace-viewer/index.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/index.css`
- `docs/design/phase-16-trace-replay-observability.md`
- `docs/tutorial/chapter-16-trace-and-replay.md`
- `docs/blog/16-observability-for-coding-agents.md`

## 验收标准

1. Web 可以按时间线查看 Agent 行为。
2. 每次文件修改都有前后证据。
3. 每次命令都有 exit code。
4. 可以导出 session trace JSON。
5. 前端界面变化必须在总结中说明。

## 验证命令

```bash
npm run typecheck
npm run build
```
