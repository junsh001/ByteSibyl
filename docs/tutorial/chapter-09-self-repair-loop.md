# 第 9 章：测试失败后的 Self-Repair Loop

本章把 Shell Runner、Patch Engine、Approval 和 Session State 串成一个最小自修复闭环。

## 1. 定义共享契约

在 `packages/shared` 中增加 `SelfRepairAttempt`：

- 记录 sessionId、command、status 和 message。
- 关联 commandId、patchId、approvalId。
- 用 steps 描述循环中的关键动作。

同时增加两个 API 响应：

- `StartSelfRepairResponse`
- `VerifySelfRepairResponse`

这些类型让 Web 和 Server 对自修复状态有同一套理解。

## 2. 持久化 attempts

在 `SessionStore` 中增加 `repairs` 集合，并把它纳入 `SessionLogResponse`。

这样页面刷新后仍能看到：

- 执行过哪些验证命令。
- 哪次失败生成了 Patch Proposal。
- 哪次重新验证通过或失败。

## 3. 新增 self-repair package

`packages/self-repair` 暴露 `planSelfRepair()`。

当前版本是教学用 heuristic：

1. 如果验证命令已经通过，不生成 Patch。
2. 如果验证失败，读取 `examples/buggy-ts-project/src/index.ts`。
3. 查找 `score: '42'`。
4. 生成把它改成 `score: 42` 的 Patch Proposal。
5. 如果找不到可识别模式，返回 `blocked`。

这里故意不接入模型，也不做复杂诊断。Phase 9 的重点是流程边界。

## 4. Server 编排循环

新增 `apps/server/src/routes/self-repair.ts`。

`POST /api/self-repair/start` 做五件事：

1. 创建或复用 session。
2. 通过 Shell Runner 运行验证命令，默认是 `npm run typecheck`。
3. 保存 command result。
4. 失败时生成 Patch Proposal。
5. 创建 approval request，等待人工审批。

注意：这里不调用 `workspace.writeTextFile()`。真正写入仍由 `/api/patches/:id/apply` 完成。

`POST /api/self-repair/verify` 只做重新验证：

1. 检查 session。
2. 如果传了 patchId，要求 patch 已经 applied。
3. 再次运行验证命令。
4. 保存 self-repair attempt。

## 5. Web 展示闭环

Agent Chat 新增 `Self-Repair Loop` 面板。

用户流程是：

1. 点击“运行自修复循环”。
2. 查看失败命令输出和 repair 状态。
3. 在 Diff Preview 查看 proposal。
4. 点击“批准”。
5. 点击“应用已批准 Patch”。
6. 点击“重新验证”。

这个顺序保留了 Human-in-the-loop，避免 agent 在失败后直接改文件。

## 6. 验证

运行：

```bash
npm run typecheck
npm run build
```

如果验证失败，先判断问题属于类型、构建还是 Phase 9 边界。如果三次修复后同一问题仍然存在，需要停止并写失败报告。
