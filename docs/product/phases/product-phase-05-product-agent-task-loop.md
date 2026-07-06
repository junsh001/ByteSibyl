# Product Phase 05: Product Agent Task Loop

## Product Goal

把教学 Agent Loop 包装为可恢复的 Product Task：记录任务状态、聊天消息、工具调用、命令、审批和 stop reason，让网页端接近 Codex IDE 插件的交互效果。

## User Value

- 用户刷新页面后能看到上次任务和聊天记录。
- 工具调用、模型调用、命令执行、审批状态都在聊天框中可见。
- 用户不再面对“运行 Agent Loop”控制台，而是发送消息给 IDE 助手。

## Allowed Scope

- 新增 ProductTask 状态机。
- Agent Run 绑定 task。
- task messages 记录 user/assistant/status/tool/command/approval/error。
- Web 聊天框恢复和展示交互记录。
- 非核心 Diff Review 折叠展示。

## Forbidden Scope

- 不实现后台无人值守长任务队列。
- 不实现 P6 多文件批量 apply。
- 不实现 P7 模型成本路由。
- 不让 Web UI 承担 agent reasoning。

## Required Artifacts

- Phase file、设计文档、中文教程、中文博客。
- Runtime task state code。
- Web chat UI improvement。

## Architecture Impact

### Memory

新增 conversation summary 和 task summary 字段；本阶段只是状态记录，不做智能检索。

### Tool Governance

工具调用结果进入 task messages，但执行仍由 ToolRunner 和 permission 控制。

### Context Lifecycle

Context 仍由 Context Engine 构建。

### Skills / Plugins / MCP

无变化。

### Security and Sandbox

审批 required 时 task 会进入 waiting_approval。文件应用仍必须人工批准。

## Web UI Requirements

- 聊天框展示 user、assistant、status、tool、command、approval、error 记录。
- 发送按钮是主入口。
- Diff Review 默认折叠。
- 侧边栏不显示内部调试面板。

## Acceptance Criteria

1. Agent Run 创建或复用 ProductTask。
2. task 状态随 run 更新。
3. 聊天框可展示交互记录和工具调用阶段。
4. 刷新后可恢复最近 session/task。

## Validation Commands

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

## Smoke Tests

- 发送消息。
- 看到模型/工具/status 气泡。
- 刷新后恢复聊天记录。
- 生成审批后看到 approval 气泡。

## Migration and Rollback

旧 session log 没有 tasks 字段时从 run events 重建聊天记录。

## Documentation Requirements

- `docs/design/product-phase-05-product-agent-task-loop.md`
- `docs/tutorial/product-phase-05-product-agent-task-loop.md`
- `docs/blog/product-phase-05-product-agent-task-loop.md`

## Remaining Risks

- Resume 仍是状态恢复，不是后台继续执行。
- Planner steps 还不能由用户编辑。
