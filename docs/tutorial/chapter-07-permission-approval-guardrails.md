# 第 7 章：Permission、Approval 与 Guardrails

本章把 Phase 6 的 Diff Preview 变成可控写入流程。目标是让 patch apply 不能绕过用户确认，也不能
绕过 guardrails。

## 1. 定义共享契约

在 `packages/shared` 中加入：

- `PermissionDecision`
- `GuardrailViolation`
- `ApprovalRequest`
- `RequestPatchApprovalResponse`
- `DecidePatchApprovalResponse`
- `ApplyPatchResponse`

同时扩展 `PatchProposalStatus`，让 proposal 可以表达 `waiting_approval`、`approved`、`rejected`、
`applied` 和 `blocked`。

## 2. 新增 permission 包

新增 `packages/permission`。它提供两个核心函数：

```text
evaluatePermission(action, permission, violations)
evaluatePatchApply(proposal)
```

当前规则很小：

- `read_only` 自动允许。
- `write_patch` 需要 approval。
- command 相关 permission 在 Phase 7 直接拒绝。

## 3. 增加 Guardrails

Patch apply 会检查：

- proposal 不能是 discarded。
- proposal 不能已经 applied。
- patch 不能为空。
- patch 改动行数不能超过阶段限制。
- path 不能命中危险模式。

如果 guardrails 失败，Server 返回 deny decision，proposal 变成 `blocked`。

## 4. 持久化 Approval

`SessionStore` 增加 approval 存储：

- 创建 pending approval。
- 更新为 approved 或 rejected。
- session log 返回 approvals。

这样用户刷新页面后，仍然能看到审批历史。

## 5. Server API

新增四个 API：

```text
POST /api/patches/:id/request-approval
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
POST /api/patches/:id/apply
```

`apply` 只接受 approved patch。它会再次检查 guardrails，然后写入 workspace 文件。

## 6. Web 流程

在 Web 中：

1. 修改 Patch Draft。
2. 生成 Diff Preview。
3. 请求审批。
4. 点击批准或拒绝。
5. 如果批准，点击应用已批准 Patch。

应用成功后，文件 viewer 和草稿内容会更新为新内容。

## 7. 验证

运行：

```bash
npm run typecheck
npm run build
```

手动 smoke 可以使用临时 workspace，避免修改仓库示例文件：创建 patch preview，请求审批，批准，
apply，再读取文件确认内容变化。

## 本章边界

Phase 7 只处理 patch write approval，不处理 shell command approval。命令执行和命令权限属于
Phase 8。
