# Product Phase 06 教程：实现多文件 Patch 与 Git 输出

P6 解决的问题是：真实项目很少只改一个文件。一个可用的 Web AI Coding Agent
必须能把多个文件作为一个整体审阅、批准、应用和导出。

## 1. 扩展 Patch 合约

在 `packages/shared` 中保留原来的 `PatchProposal` 字段，同时新增
`PatchFileChange`：

```ts
export interface PatchFileChange {
  path: string;
  oldPath?: string;
  kind: 'create' | 'modify' | 'delete' | 'rename';
  unifiedDiff: string;
  originalContentHash?: string;
}
```

这样旧的单文件 proposal 仍可使用，新的多文件 proposal 通过 `files[]` 表达。

## 2. 在 Patch Engine 中生成多文件 Diff

`createMultiFilePatchProposal` 接收多个文件输入，逐个生成 hunk 和
`unifiedDiff`，最后拼成一个总 patch。

每个文件会保存 `originalContentHash`。它不是给 UI 展示的，而是给 apply 前的
conflict 检测使用。

## 3. Server Preview API

`POST /api/patches/preview` 现在支持两种形态：

```json
{ "path": "src/a.ts", "updatedContent": "..." }
```

或者：

```json
{
  "files": [
    { "path": "src/a.ts", "kind": "modify", "updatedContent": "..." },
    { "path": "src/b.ts", "kind": "create", "updatedContent": "..." }
  ]
}
```

第一种保持兼容，第二种是 P6 新增能力。

## 4. Apply 前冲突检测

Apply 时 Server 会重新读取每个文件。如果当前内容 hash 与 proposal 创建时不同，
说明用户或工具已经改过文件，系统会拒绝 apply。

这一步比直接覆盖更保守，适合产品化阶段。

## 5. Web Review All

Web 编辑器工具栏新增 `Review All`。它会收集当前打开且 dirty 的文件，创建一个
多文件 proposal。

Review tab 中可以：

- 查看 commit message 草稿；
- 下载 `.patch`；
- 在多文件列表中切换文件；
- 用 Monaco Diff 查看每个文件变化。

## 6. Git 输出

Apply 成功后，Server 返回 `gitDiff`。它来自 workspace 中的 `git diff --binary`。

这个输出用于确认“已应用到 workspace 的真实 Git diff”和“用户在 Review 中看到的
patch”一致。

## 验证

运行：

```bash
npm run typecheck
npm run build
git diff --check
```

建议 smoke：

1. 打开两个文件并修改。
2. 点击 `Review All`。
3. 在 Review tab 切换文件 diff。
4. 请求审批、批准、应用。
5. 确认 apply response 包含 `gitDiff`。

## 当前边界

- 不自动创建 commit。
- 不自动创建 GitHub PR。
- 不处理二进制 diff 的可视化展示。
- rename conflict 只做基线 hash 和目标路径检查。
