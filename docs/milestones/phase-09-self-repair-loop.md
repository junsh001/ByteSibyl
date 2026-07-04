# Phase 9: Self-Repair Loop

## 目标

实现测试失败后的最小自修复循环：运行安全验证命令，捕获失败结果，生成 Patch Proposal，
等待 Human-in-the-loop 审批，应用后重新验证。

## 允许范围

- 新增 `packages/self-repair`。
- 定义 Self-Repair 共享契约。
- Server 暴露 self-repair start/verify API。
- Self-Repair 只能调用 Phase 8 Shell Runner 执行白名单命令。
- 修复必须先生成 Patch Proposal，不能直接写文件。
- Patch 应用必须继续走 Phase 7 approval 和 guardrails。
- `SessionStore` 持久化 self-repair attempt。
- Web 展示 Self-Repair Loop 的状态、命令、结果和重新验证入口。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 LSP Diagnostics。
- 不实现真实模型自动修复。
- 不实现多轮自动 apply。
- 不实现多轮自动 retry。
- 不实现完整失败报告生成器。
- 不绕过 approval 直接写文件。
- 不实现命令 approval。
- 不实现后台长任务队列。
- 不新增生产依赖。

## 必需产物

- `packages/self-repair`
- `packages/shared/src/index.ts`
- `packages/telemetry/src/index.ts`
- `apps/server/src/routes/self-repair.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/index.css`
- `docs/design/phase-09-self-repair-loop.md`
- `docs/tutorial/chapter-09-self-repair-loop.md`
- `docs/blog/09-self-repair-loop-needs-human-boundaries.md`

## 验收标准

1. Web 可以触发 self-repair start。
2. Server 通过 Shell Runner 运行安全验证命令。
3. 验证失败后生成 Patch Proposal。
4. Patch Proposal 进入 approval 流程，不能自动写入。
5. 用户应用已批准 Patch 后，可以重新验证。
6. Session Log 包含 self-repair attempts。
7. 文档明确当前修复器是教学用 heuristic，不是完整自动修复系统。
8. 示例项目保持初始 typecheck 失败状态，便于演示失败到 Patch Proposal 的流程。

## 验证命令

```bash
npm run typecheck
npm run build
```
