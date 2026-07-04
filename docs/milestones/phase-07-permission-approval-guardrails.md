# Phase 7: Permission、Approval 与 Guardrails

## 目标

在 Patch Preview 之后加入最小 permission policy、guardrails 和 Human-in-the-loop approval。文件写入
必须先通过 guardrails，再由用户批准，最后才能 apply patch。

## 允许范围

- 新增 `packages/permission`。
- 定义 permission decision、guardrail violation、approval request 的共享契约。
- Patch Proposal 支持 `waiting_approval`、`approved`、`rejected`、`applied`、`blocked` 状态。
- Server 暴露请求审批、批准、拒绝和应用已批准 patch 的 API。
- `SessionStore` 持久化 approval history。
- Workspace 增加受控 text file write，用于应用已批准 patch。
- Web 展示 approval 状态、guardrail 失败、批准/拒绝/应用按钮。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 shell runner。
- 不执行任何命令。
- 不实现命令审批。
- 不实现自动修复循环。
- 不接入真实模型 API。
- 不实现多用户权限系统或登录鉴权。
- 不新增生产依赖。

## 必需产物

- `packages/permission`
- `packages/shared/src/index.ts`
- `packages/telemetry/src/index.ts`
- `packages/workspace/src/index.ts`
- `apps/server/src/routes/patches.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/index.css`
- `docs/design/phase-07-permission-approval-guardrails.md`
- `docs/tutorial/chapter-07-permission-approval-guardrails.md`
- `docs/blog/07-approval-is-a-state-machine.md`

## 验收标准

1. Patch Proposal 可以请求 approval。
2. Guardrails 可以拒绝空 patch、过大 patch、危险路径。
3. Web 可以批准或拒绝 pending approval。
4. 只有 approved patch 可以 apply。
5. Apply 会写入 workspace 文件，并更新 proposal 状态为 `applied`。
6. Session Log 包含 approvals。
7. 没有实现 shell runner、命令执行或自动修复循环。

## 验证命令

```bash
npm run typecheck
npm run build
```
