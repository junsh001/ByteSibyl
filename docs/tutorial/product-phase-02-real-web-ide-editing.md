# Product Phase 02 教程：把只读文件区升级为真实 Web IDE 编辑器

## 目标

P2 的目标是让用户可以在 Web 中像 IDE 一样编辑文件草稿，并用 Monaco Diff 查看修改。但所有写入仍必须经过 Patch Proposal 和人工审批。

本章实现四件事：

- Monaco Editor。
- 最近打开文件 tab。
- 编辑草稿和 dirty 状态。
- Monaco DiffEditor + Patch Preview 队列。

## 1. 引入编辑状态

前端维护打开文件列表：

```ts
interface OpenFileTab {
  path: string;
  originalContent: string;
  draftContent: string;
  readOnly: boolean;
}
```

打开文件时从 Server 读取内容，写入 `originalContent` 和 `draftContent`。用户编辑 Monaco 时，只更新 `draftContent`。

判断 dirty：

```ts
const dirty = draftContent !== originalContent;
```

这一步很重要：草稿不是文件写入。刷新页面后草稿会丢失，这是 P2 的明确边界。

## 2. 用 Monaco Editor 替换只读 `<pre>`

中间编辑区使用：

```tsx
<Editor
  value={activeOpenFile.draftContent}
  defaultLanguage={languageForPath(activeOpenFile.path)}
  options={{
    minimap: { enabled: false },
    readOnly: activeOpenFile.readOnly,
    automaticLayout: true,
  }}
  onChange={updateEditorDraft}
/>
```

`languageForPath` 根据扩展名选择 TypeScript、JavaScript、JSON、CSS、Markdown 等语言。

## 3. 大文件只读保护

P2 设置前端阈值：

```ts
const MAX_EDITABLE_BYTES = 256 * 1024;
```

超过阈值的文件进入 read-only 模式。这个保护主要是 UX 层面的，避免浏览器编辑大文件卡顿。Server 仍有读取和 patch preview 大小限制。

## 4. 从草稿生成 Patch Proposal

用户点击“生成 Diff”时，发送当前草稿：

```ts
await api.createPatchPreview({
  sessionId,
  path: selectedFile.path,
  updatedContent: patchDraft,
});
```

Server 会重新读取 workspace 中的当前文件内容作为 original，再生成 Patch Proposal。

写入路径仍是：

```text
生成 Diff -> 请求审批 -> 批准 -> 应用
```

没有任何 Monaco 编辑会直接写入文件。

## 5. 使用 Monaco DiffEditor

Diff Preview 从纯文本 unified diff 升级为 Monaco DiffEditor：

```tsx
<DiffEditor
  original={originalContent}
  modified={proposal.updatedContent}
  language={languageForPath(proposal.path)}
  options={{ readOnly: true, renderSideBySide: true }}
/>
```

用户可以在 Diff Preview 中切换不同 Patch Proposal。P2 的多文件支持是 preview queue，不是批量 apply。

## 6. 侧边栏改成聊天框

右侧栏不再展示 Patch 编辑区，也不再使用“运行 Agent Loop”作为主按钮。

新的结构是：

```text
Workspace compact status
Chat message list
Textarea
发送 / 停止
```

项目绑定和创建隔离 workspace 放进折叠的“项目设置”，避免占据聊天主流程。

## 7. 验证

运行：

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

手工 smoke：

1. 打开左侧文件。
2. 在 Monaco 中编辑一行。
3. tab 出现 dirty 标记。
4. 点击生成 Diff。
5. Diff Preview 显示 Monaco side-by-side diff。
6. 请求审批、批准、应用。
7. dirty 状态消失。
8. 在右侧聊天框输入消息并点击“发送”。

## 8. 边界

P2 不实现：

- 草稿持久化。
- 批量 apply 多文件 patch。
- 让 Agent 直接读取未保存前端草稿。
- 产品级可恢复 Task Loop。
- Sandbox Runner。

这些能力留给后续产品化阶段。
