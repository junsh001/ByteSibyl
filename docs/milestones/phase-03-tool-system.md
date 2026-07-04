# Phase 3: Tool System

## 目标

把 Phase 2 的 workspace 普通函数升级为可被 Agent 调用的结构化工具能力。本阶段实现
Tool Registry、Tool Runner、输入 schema 校验、标准 ToolResult，并注册只读 workspace
工具。

## 允许范围

- 新增 `packages/tool-system`。
- 在 `packages/shared` 中定义 ToolDefinition、ToolCallRequest、ToolResult 等共享类型。
- 注册 `get_workspace_tree`、`read_file`、`search_text` 三个只读工具。
- Server 暴露工具列表和工具调用 API，供 Web 调试工具系统。
- Web 展示已注册工具，并能手动调用 `read_file` 验证结构化工具结果。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 Agent Loop。
- 不接入模型 provider。
- 不实现模型 function calling。
- 不实现写文件工具。
- 不实现 patch。
- 不实现 shell command。
- 不实现 approval/guardrails。
- 不新增生产依赖。

## 必需产物

- `packages/tool-system`
- `packages/shared/src/index.ts`
- `apps/server/src/routes/tools.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `docs/design/phase-03-tool-system.md`
- `docs/tutorial/chapter-03-tool-system.md`
- `docs/blog/03-tools-are-structured-outputs.md`

## 验收标准

1. 工具可以通过 name 调用。
2. 错误参数会被 schema 校验拒绝。
3. 工具调用结果使用标准 `ToolResult`。
4. Web 能看到工具列表和一次手动工具调用结果。
5. 前后端共享 Tool 类型。
6. 没有新增 Agent Loop、模型调用、写文件、命令执行或 patch 行为。

## 验证命令

```bash
npm run typecheck
npm run build
```
