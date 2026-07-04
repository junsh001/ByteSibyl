# Phase 6: Patch Engine 与 Diff Preview

## 目标

实现最小 Patch Engine，让系统可以基于原文件内容和草稿内容生成 Patch Proposal，并在 Web UI 中
展示 Diff Preview。Phase 6 的重点是“提出变更”和“看清变更”，不是应用变更。

## 允许范围

- 新增 `packages/patch-engine`。
- 在 `packages/shared` 中定义 Patch Proposal、Hunk、Patch Line 和 Preview API 契约。
- Server 暴露 Patch Preview API。
- Patch Proposal 可以绑定到 Session，并写入 Session Log。
- Web 提供 Patch Draft 编辑区。
- Web 展示 unified diff、增删统计和 patch history。
- 支持 discard proposal，只改变 proposal 状态。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不真正写入 workspace 文件。
- 不实现 approval/guardrails。
- 不实现 patch apply。
- 不实现 shell command。
- 不实现自动修复循环。
- 不接入真实模型 API。
- 不新增生产依赖。

## 必需产物

- `packages/patch-engine`
- `packages/shared/src/index.ts`
- `packages/telemetry/src/index.ts`
- `apps/server/src/routes/patches.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/index.css`
- `docs/design/phase-06-patch-engine.md`
- `docs/tutorial/chapter-06-patch-engine.md`
- `docs/blog/06-diff-preview-before-file-write.md`

## 验收标准

1. Web 可以基于当前文件草稿生成 Diff Preview。
2. Patch Engine 返回 unified diff、hunks、additions 和 deletions。
3. Patch Proposal 可以保存到 Session Log。
4. Web 可以显示最近的 patch history。
5. Discard 只更新 proposal 状态，不修改文件。
6. 没有实现 approval、apply、shell 或文件写入。

## 验证命令

```bash
npm run typecheck
npm run build
```
