# Phase 3 设计说明：Tool System

## 目标

Phase 3 把 workspace 能力从普通函数提升为结构化工具。Agent 后续不能直接随意调用内部函数，
而应该通过 Tool Registry 找工具，通过 Tool Runner 校验输入并返回标准结果。

## 边界

本阶段只做工具系统，不做 Agent Loop。也就是说，工具可以被 Server 和 Web 手动调用，但还
不会被模型自动调用。

## 核心接口

`packages/tool-system` 定义：

```ts
export interface Tool<I, O> {
  name: string;
  description: string;
  schema: JsonSchema;
  permission: ToolPermission;
  run(input: I, context: ToolContext): Promise<O>;
}
```

同时提供：

- `ToolRegistry`：注册和列出工具。
- `ToolRunner`：按 name 查找工具、校验 input、执行工具、返回 `ToolResult`。
- `createWorkspaceToolRegistry()`：注册 workspace 只读工具。

## Schema 校验

Phase 3 使用项目内最小 JSON schema 子集，不引入生产依赖。当前支持：

- object input。
- required 字段。
- additionalProperties。
- string 类型。
- minLength。

这足够校验 `read_file` 和 `search_text` 的输入。更完整的 schema 校验可以在后续工程化阶段
替换为成熟库。

## 已注册工具

- `get_workspace_tree`
- `read_file`
- `search_text`

它们全部是 `read_only` permission，不会写文件、运行命令或修改状态。

## Server API

`apps/server/src/routes/tools.ts` 暴露：

```text
GET  /api/tools
POST /api/tools/run
```

这是调试入口，不是 Agent Loop。Phase 4 才会让模型通过结构化 tool call 使用这些工具。

## 当前限制

- 没有模型调用。
- 没有多轮 observation。
- 没有写工具。
- 没有 permission policy，只在工具定义上标注 permission。
- trace 暂时是内存对象，完整 telemetry 留到后续阶段。
