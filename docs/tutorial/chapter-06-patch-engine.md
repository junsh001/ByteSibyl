# 第 6 章：Patch Engine 与 Diff Preview

本章开始进入“代码变更”能力。关键原则是：先提出变更，再展示 diff，最后才考虑是否应用。
Phase 6 不写文件，只生成 Patch Proposal。

## 1. 定义 Patch 契约

先在 `packages/shared` 中加入 Patch 相关 DTO：

- `PatchProposal`
- `PatchHunk`
- `PatchLine`
- `CreatePatchPreviewRequest`
- `CreatePatchPreviewResponse`

这些类型会被 Web、Server 和 Patch Engine 共同使用。`PatchProposal` 当前只有 `proposed` 和
`discarded` 两种状态，因为 approval 和 apply 还没有进入本阶段。

## 2. 创建 Patch Engine 包

新增 `packages/patch-engine`。它的核心函数是：

```text
createPatchProposal(input) -> PatchProposal
```

输入包括：

- patch id
- session id
- 文件路径
- 原始内容
- 修改后的草稿内容

输出包括：

- unified diff
- hunks
- additions
- deletions
- line count

本章使用 line-based LCS 生成 diff，不依赖外部库。这样可以直接看到 Diff Preview 的核心结构。

## 3. Server 生成 Patch Preview

新增 `apps/server/src/routes/patches.ts`：

```text
POST /api/patches/preview
```

请求带上文件路径和 `updatedContent`。Server 会通过 `WorkspaceService` 读取原文件内容，再调用
Patch Engine 生成 proposal。如果请求带 `sessionId`，proposal 会写入 `SessionStore`。

这个 API 不写文件。它只负责生成和保存 proposed diff。

## 4. Session Log 记录 patch history

`SessionStore` 增加 patch proposal 存储。`GET /api/sessions/:id/log` 返回：

- session
- runs
- patches

这样 Web 可以在同一个 session 中看到 Agent Run 和 Patch Proposal 两种历史。

## 5. Web 显示 Diff Preview

前端新增 `Patch Draft` 区块：

1. 选择文件。
2. 修改草稿内容。
3. 点击“生成 Diff Preview”。
4. 右下角显示 unified diff。
5. 底部日志显示 patch history。

也可以点击“丢弃 Patch Proposal”，这只会把状态改成 `discarded`，不会修改 workspace 文件。

## 6. 验证

运行：

```bash
npm run typecheck
npm run build
```

然后启动开发服务，选择 `src/index.ts`，把草稿里的 `score: '42'` 改成 `score: 42`，生成 Diff
Preview。应该看到一条 remove 和一条 add。

## 本章边界

Phase 6 不做 approval，不 apply patch，不运行命令，也不做自动修复。它只让系统具备“看清变更”
的能力。
