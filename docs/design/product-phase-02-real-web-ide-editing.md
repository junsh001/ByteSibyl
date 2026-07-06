# Product Phase 02 设计说明：Real Web IDE Editing

## 背景

P1 让 ByteSibyl 可以把用户项目隔离到 Git worktree。P2 继续补齐产品体验：Web 中间区域不能只是只读文件预览，而应该成为真实 IDE 编辑区。

本阶段的核心约束是：用户可以编辑草稿，但文件写入仍必须走 Patch Proposal、Approval 和 Apply。编辑器不能绕过权限边界。

## 设计目标

- 使用 Monaco Editor 作为中间代码编辑器。
- 打开文件后形成最近打开 tab。
- 编辑内容保存在 browser runtime draft 中。
- dirty 状态直接显示在 tab 和编辑器 header。
- 大文件进入只读保护，避免页面卡死。
- Diff Preview 使用 Monaco DiffEditor 展示 current vs proposed。
- 支持多个文件生成 Patch Preview 队列，但不实现批量 apply API。
- 右侧栏改成 IDE 插件聊天框：消息流、输入框、发送按钮。

## 编辑状态模型

前端新增 `OpenFileTab`：

```ts
interface OpenFileTab {
  path: string;
  originalContent: string;
  draftContent: string;
  readOnly: boolean;
}
```

`originalContent` 来自 workspace 文件读取结果。`draftContent` 是用户在 Monaco 中编辑的草稿。二者不同即 dirty。

草稿不会自动写入磁盘，也不会进入 Context Engine。后续如果要让 Agent 读取未保存草稿，需要在 P5 或后续阶段显式设计 draft context。

## Patch 流程

P2 复用既有 Patch API：

```text
draftContent
  -> POST /api/patches/preview
  -> Patch Proposal
  -> request approval
  -> approve
  -> apply
  -> WorkspaceService.writeTextFile
```

生成 Diff 时，前端把当前 tab 的 `draftContent` 作为 `updatedContent` 发送给 Server。Server 仍从 workspace 读取原始文件，创建 Patch Proposal。

应用成功后，前端会把对应 tab 的 `originalContent` 和 `draftContent` 同步为已应用内容，dirty 状态消失。

## 多文件 Diff Preview

P2 增加的是前端 Patch Preview 队列：

- 用户可以打开多个文件。
- 每个文件都可以生成独立 Patch Proposal。
- Diff Preview 中可以切换不同 proposal。

这不是批量 apply，也不是多文件 Patch API。批量变更、commit 和 PR 草稿留到 P6。

## 大文件保护

P2 在前端设置 `MAX_EDITABLE_BYTES = 256 * 1024`。超过阈值的文件可以打开，但 Monaco 以 read-only 模式展示，避免在浏览器中编辑大文件导致卡顿。

Server 仍保留 workspace read/patch 的大小保护。前端只读是 UX 防护，不是安全边界。

## 右侧栏重新设计

P1 右侧栏已经隐藏大量教学调试面板。P2 进一步精简：

- 顶部只保留 compact workspace 状态。
- 项目绑定和创建 workspace 放入折叠的“项目设置”。
- 中间是消息流，包含 user、assistant、status、error bubble。
- 底部是 textarea 和“发送”按钮。
- 不再把“运行 Agent Loop”作为主按钮文案。

这样右侧栏更接近主流 IDE 插件聊天框，而不是内部调试控制台。

## 架构影响

### Memory

无持久 memory 变更。编辑草稿是前端运行时状态，刷新页面会丢失。

### Tool Governance

文件写入仍由 Patch/Approval/Guardrails 控制。Monaco 编辑器不能直接调用 workspace write。

### Context Lifecycle

Context Engine 仍读取 workspace 文件系统，不读取前端草稿。

### Skills / Plugins / MCP

无变化。

### Security and Sandbox

P2 不增加命令 sandbox。安全边界仍是：草稿不落盘，apply 必须审批。

## 已知限制

- Monaco 增加 Web bundle 体积。
- 未实现持久化草稿。
- 未实现批量 apply 多文件 patch。
- Chat 仍调用现有 Agent Run API，只是产品界面改成“发送消息”。
