# Phase 6 Design: Patch Engine 与 Diff Preview

## 背景

前几个阶段已经能读取 workspace、调用结构化工具、运行最小 Agent Loop，并把 run 状态写入
Session Log。接下来要进入“改代码”的路径，但直接写文件会让系统失去教学价值和可控性。

Phase 6 只实现 Patch Proposal 和 Diff Preview：系统可以提出变更、展示变更、记录变更历史，但不
应用到磁盘。

## 数据模型

共享契约新增：

- `PatchProposal`
- `PatchHunk`
- `PatchLine`
- `CreatePatchPreviewRequest`
- `CreatePatchPreviewResponse`

Patch Proposal 包含：

- 目标文件路径。
- 状态：`proposed` 或 `discarded`。
- 增删统计。
- line-based hunks。
- unified diff 文本。
- 可选 `sessionId`。

当前阶段没有 `approved` 或 `applied` 状态，因为 approval 和 apply 是后续阶段。

## Patch Engine

`packages/patch-engine` 接收：

```text
originalContent + updatedContent + path -> PatchProposal
```

内部使用 line-based LCS 生成差异，然后输出两种结构：

- 面向机器的 `hunks`。
- 面向人类和调试的 `unifiedDiff`。

实现刻意保持轻量，不引入生产依赖。它适合教学和小文件预览，不是完整 git diff 替代品。

## Server 边界

Server 新增：

- `POST /api/patches/preview`
- `GET /api/patches/:id`
- `POST /api/patches/:id/discard`

Preview API 会读取 workspace 中的原文件，和请求里的 `updatedContent` 生成 proposal。如果请求带
`sessionId`，proposal 会保存到 `SessionStore`。

Server 不写文件。Discard 也只改状态。

## Web 体验

Web 新增 `Patch Draft` 区块。用户选择文件后，草稿默认填入当前文件内容；修改草稿后可以生成
Diff Preview。右下角的 Diff Preview 面板展示 unified diff 和增删统计。

底部 log 会显示 session 中的 patch history，帮助学习者理解 proposal 也是 session state 的一部分。

## 后续边界

Phase 7 才会引入 approval/guardrails。Phase 8 才会引入 shell runner。Phase 9 才会把诊断、
patch 和验证连成 self-repair loop。Phase 6 的职责到 Diff Preview 为止。
