# Phase 5: Session State 与长任务控制

## 目标

把 Phase 4 的一次性 Agent Loop 升级为可追踪的 session run。Server 负责创建
Session、创建 Run、记录事件和 Step，并提供取消长任务的最小控制入口。

## 允许范围

- 新增 `packages/telemetry`，实现最小 `SessionStore`。
- 在 `packages/shared` 中定义 Session、Run、Step 的共享契约。
- Agent Loop 支持 `AbortSignal`，可以在安全边界处停止。
- Server 持久化 run events 和 step log。
- Server 暴露 session log API。
- Server 暴露 cancel run API。
- Web 展示 Session 状态、当前 Run、取消按钮和已持久化 Step。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 approval/guardrails。
- 不实现 patch 或写文件。
- 不实现 shell command。
- 不实现后台队列、分布式任务或多用户隔离。
- 不实现 Trace Replay 或 Evaluation。
- 不接入真实模型 API。
- 不新增生产依赖。

## 必需产物

- `packages/telemetry`
- `packages/shared/src/index.ts`
- `packages/agent-core/src/index.ts`
- `apps/server/src/routes/agent.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `docs/design/phase-05-session-state.md`
- `docs/tutorial/chapter-05-session-state.md`
- `docs/blog/05-agent-needs-session-state.md`

## 验收标准

1. Agent run 会绑定到 Session。
2. Server 会记录 run events 和 step log。
3. Session log 可以通过 API 读取。
4. Web 可以显示当前 Session 状态、Run id 和持久化 Step。
5. Web 可以请求取消仍在运行的 Run。
6. 取消不会实现 approval、patch、shell 或其他未来阶段能力。

## 验证命令

```bash
npm run typecheck
npm run build
```
