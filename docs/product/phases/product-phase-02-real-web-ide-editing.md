# Product Phase 02: Real Web IDE Editing

## Product Goal

让 Web 编辑区从只读文件展示升级为真实可用的 IDE 编辑体验：用户可以打开文件、编辑草稿、管理最近打开文件、查看 Monaco Diff，并继续通过 Patch Proposal 和审批路径应用修改。

## User Value

- 用户可以像使用 IDE 插件一样在 Web 内查看和编辑代码草稿。
- 用户可以在发送 AI 消息前后直接调整文件内容。
- 用户能在应用前看到更清晰的 proposed vs current Diff。
- 文件写入仍不静默落盘，必须经过 Patch Proposal 和 Human-in-the-loop Approval。

## Allowed Scope

- Web 接入 Monaco Editor 和 Monaco DiffEditor。
- 增加前端编辑草稿状态、dirty 状态、只读保护和最近打开文件 tab。
- 让现有单文件 Patch Proposal 可以由编辑器草稿生成。
- 支持在 UI 中维护多个文件的 Patch Preview 队列。
- 右侧栏继续产品化精简为 IDE 插件聊天框：消息流、输入框、发送按钮、必要状态。
- 补充 P2 设计文档、中文教程、中文博客。

## Forbidden Scope

- 不实现静默保存到 workspace 文件。
- 不绕过 Patch Proposal / Approval / Apply 流程。
- 不实现 P3 的 Durable State Store。
- 不实现 P5 的产品级多轮 Task Loop。
- 不实现真正批量 apply 多文件 patch。
- 不新增远程协作、账号、多租户或 PR 创建功能。

## Required Artifacts

- `docs/product/phases/product-phase-02-real-web-ide-editing.md`
- `docs/design/product-phase-02-real-web-ide-editing.md`
- `docs/tutorial/product-phase-02-real-web-ide-editing.md`
- `docs/blog/product-phase-02-real-web-ide-editing.md`
- Runtime/Web code for real editing experience.
- Validation and UI smoke checks.

## Architecture Impact

### Memory

本阶段不新增长期 memory。编辑草稿是 browser runtime state，不写入 project/workspace memory。

### Tool Governance

工具治理不变。文件写入仍由 Patch Proposal、Approval、Guardrails 和 WorkspaceService 执行。

### Context Lifecycle

Context Engine 不读取未提交的前端草稿。后续阶段如果需要把草稿纳入上下文，必须显式建模。

### Skills / Plugins / MCP

本阶段不改变 skill/plugin/MCP 加载。

### Security and Sandbox

本阶段只改变 Web 编辑体验。保存草稿不会写磁盘，应用 Patch 仍需要审批。命令 sandbox 不在本阶段实现。

## Web UI Requirements

- 中间编辑区使用 Monaco Editor。
- 顶部展示最近打开文件 tab 和 dirty 状态。
- 大文件进入只读模式或显示保护提示。
- Diff Preview 使用 Monaco DiffEditor 展示 current/proposed。
- 右侧栏以 IDE 插件聊天框形式展示：workspace 小状态、消息流、输入框、发送按钮。
- 右侧栏不能再用“运行 Agent Loop”作为主要用户动作文案。

## Acceptance Criteria

1. 用户可以打开文件并在 Monaco Editor 中编辑草稿。
2. 编辑器 dirty 状态可见。
3. 用户可以从草稿生成 Patch Proposal。
4. Diff Preview 使用 Monaco DiffEditor 展示原始内容和 proposed 内容。
5. 多个文件可进入 Patch Preview 队列，用户可以切换查看。
6. 大文件不会导致页面卡死，并有只读保护。
7. 右侧栏是主流 IDE 插件聊天框形态，主按钮是“发送”。
8. 代码应用仍必须经过审批。

## Validation Commands

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

## Smoke Tests

- 打开一个文件，编辑草稿，看到 dirty 状态。
- 点击生成 Diff，看到 Monaco Diff Preview。
- 请求审批、批准、应用 Patch 后，文件内容刷新。
- 发送聊天消息，右侧栏出现用户消息和 assistant/status 消息。

## Migration and Rollback

- 无数据迁移。
- 回滚 P2 只影响 Web UI 编辑体验，不改变已有 Project/Workspace metadata。

## Documentation Requirements

- Design doc: `docs/design/product-phase-02-real-web-ide-editing.md`
- Tutorial chapter: `docs/tutorial/product-phase-02-real-web-ide-editing.md`
- Blog draft: `docs/blog/product-phase-02-real-web-ide-editing.md`

## Remaining Risks

- Monaco bundle 体积会增加 Web build 输出。
- 前端草稿目前不持久化，刷新页面会丢失。
- 多文件 Patch Preview 队列是 UI 队列，不是批量 apply API。
