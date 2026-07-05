# 一个 Coding Agent 产品，为什么需要真正的 Web IDE 编辑器

P1 解决了 Agent 在哪里工作：独立 Git worktree。P2 解决用户在哪里工作：真实 Web IDE 编辑区。

如果中间区域只是只读代码预览，用户会被迫在外部编辑器和 Web Agent 之间来回切换。这样的体验很难形成闭环：用户看不到草稿状态，也无法自然地调整 Agent 生成的修改。

P2 把编辑器升级为 Monaco Editor，让 ByteSibyl 更接近一个真正可用的 coding workspace。

## 编辑器不是写入权限

引入 Monaco 不代表允许静默写文件。

ByteSibyl 的产品原则是：所有文件写入都必须可预览、可审批、可回滚。因此 P2 的编辑器只产生草稿：

```text
originalContent + draftContent
```

用户在浏览器里编辑的是 `draftContent`。只有当用户生成 Patch Proposal、请求审批、批准并应用后，内容才会写入 task workspace。

这个边界避免了一个常见问题：UI 看起来像编辑器，但背后悄悄改了磁盘文件。Coding Agent 产品不能这么做。

## Diff 必须成为一等体验

AI coding 的核心不是“生成代码”，而是“让用户理解并批准变更”。

P2 使用 Monaco DiffEditor 展示 current vs proposed。相比纯文本 unified diff，side-by-side diff 更适合日常审查：

- 用户可以快速对照修改前后。
- 大段代码更容易阅读。
- 多文件 proposal 可以在队列中切换。

这一步让 Patch Proposal 从教学机制变成产品界面。

## 侧边栏应该像聊天插件，而不是控制台

教学 Lab 阶段，右侧栏展示过 provider、context、trace、evaluation、hooks、subagents 等内部面板。这些内容对理解 Agent 很有价值，但对日常用户是噪音。

P2 继续收敛侧边栏：

- 顶部是很小的 workspace 状态。
- 中间是 user/assistant/status/error 消息流。
- 底部是输入框和“发送”按钮。

这更符合主流 IDE 插件聊天框的使用习惯。用户不需要知道当前按钮背后是 Agent Run API；用户只是在给助手发送消息。

## 大文件保护是产品细节

Monaco 很强，但浏览器不是无限资源。P2 对超过阈值的文件启用只读模式，避免大文件编辑拖垮页面。

这不是安全沙箱，而是产品体验保护。真正的命令和文件系统隔离仍要依赖后续 Sandbox Runner。

## P2 之后还差什么

P2 让用户可以在 Web 中编辑和审查，但它还不是完整 coding workflow：

- 草稿刷新后会丢失。
- 多文件 Patch Preview 只是 UI 队列，不是批量 apply。
- Agent 还不能显式读取未保存草稿。
- 任务状态还不能完整恢复。

这些问题会进入后续 Durable State Store、Product Agent Task Loop 和 Multi-file Patch 阶段。

P2 的价值在于把产品表面从“实验室控制台”推进到“可用 IDE 工作台”：用户有文件、有编辑、有 diff、有聊天，也有明确的审批边界。
