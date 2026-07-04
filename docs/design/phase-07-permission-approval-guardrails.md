# Phase 7 Design: Permission、Approval 与 Guardrails

## 背景

Phase 6 已经能生成 Patch Proposal 和 Diff Preview，但它刻意不写文件。Phase 7 的目标是把“写入”
变成一个显式状态机：先做 permission decision，再进入 Human-in-the-loop approval，最后 apply。

## Permission Policy

新增 `packages/permission`，当前实现最小 policy：

- `read_only`：允许。
- `write_patch`：需要 approval。
- `execute_safe`、`execute_risky`、`forbidden`：拒绝。命令执行留到 Phase 8。

Patch apply 使用 `write_patch` permission class。它不会自动执行，必须先产生 pending approval。

## Guardrails

Patch apply 前会检查：

- Patch 是否已被丢弃。
- Patch 是否已经应用。
- Patch 是否为空。
- 改动行数是否超过 Phase 7 限制。
- 路径是否命中危险模式，例如 `.env`、`.git/`、`node_modules/`、`package-lock.json`。

Guardrails 失败时，proposal 会进入 `blocked`，不会产生 approval。

## Approval 状态机

Phase 7 定义 `ApprovalRequest`：

```text
pending -> approved
pending -> rejected
```

Patch Proposal 的主要状态：

```text
proposed -> waiting_approval -> approved -> applied
proposed -> waiting_approval -> rejected
proposed -> blocked
proposed -> discarded
```

`approved` 只是允许 apply，不代表已经写入。只有 `/api/patches/:id/apply` 成功后，状态才变成
`applied`。

## Server API

- `POST /api/patches/:id/request-approval`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `POST /api/patches/:id/apply`

Apply 会再次检查 proposal 状态、approval 和 guardrails，然后通过 `WorkspaceService.writeTextFile()`
写入文件。

## Web UI

Web 在 Patch Draft 下新增：

- 请求审批。
- 批准。
- 拒绝。
- 应用已批准 Patch。
- Patch 状态和 Approval 状态。

Session State 中显示 approval 数量，底部 log 显示最近 approval history。

## 边界

Phase 7 不实现 shell runner，不执行命令，不做自动修复，也不接入真实模型。它只把文件写入这件事
放到 permission、approval 和 guardrails 之后。
