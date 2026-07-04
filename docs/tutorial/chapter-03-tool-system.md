# 第 3 章：Tool System：把能力变成结构化动作

## 本章目标

本章把 Phase 2 的 workspace 能力注册为结构化工具。完成后，系统可以通过工具名调用：

- `get_workspace_tree`
- `read_file`
- `search_text`

工具输入会先经过 schema 校验，结果统一返回 `ToolResult`。

## 为什么需要 Tool System

如果 Agent 只能输出自然语言，系统很难可靠执行动作。Tool System 的作用是把“我要读一个文件”
变成结构化动作：

```json
{
  "name": "read_file",
  "input": {
    "path": "src/index.ts"
  }
}
```

这样 Server 可以确定调用哪个函数、校验参数、记录结果，并把 observation 返回给后续 Agent
Loop。

## 核心类型

共享类型在 `packages/shared/src/index.ts`：

- `ToolDefinition`
- `ToolPermission`
- `ToolCallRequest`
- `ToolResult`
- `ToolCallTrace`

运行时实现位于 `packages/tool-system/src/index.ts`：

- `Tool`
- `ToolRegistry`
- `ToolRunner`
- `createWorkspaceToolRegistry`

## 关键实现

`ToolRegistry` 负责注册工具：

```text
register(tool)
get(name)
list()
```

`ToolRunner` 负责执行工具：

```text
查找工具 -> 校验 input -> 执行 run() -> 返回 ToolResult
```

如果工具不存在或参数错误，runner 会返回失败的 `ToolResult`，不会抛出到 HTTP 层导致服务崩溃。

## Server 调试 API

本章新增：

```text
GET  /api/tools
POST /api/tools/run
```

示例：

```bash
curl --noproxy '*' http://127.0.0.1:8787/api/tools

curl --noproxy '*' -X POST http://127.0.0.1:8787/api/tools/run \
  -H 'Content-Type: application/json' \
  -d '{"name":"read_file","input":{"path":"src/index.ts"}}'
```

错误参数会被拒绝：

```bash
curl --noproxy '*' -X POST http://127.0.0.1:8787/api/tools/run \
  -H 'Content-Type: application/json' \
  -d '{"name":"read_file","input":{}}'
```

## Web 效果

右侧 Agent 面板新增 Tool System 区域：

- 展示已注册工具。
- 展示工具 permission。
- 可以用 `read_file` 工具读取当前文件。
- 展示标准 `ToolResult`。

这仍然不是 Agent Loop，只是为 Phase 4 准备确定性的工具调用层。

## 验收方式

运行：

```bash
npm run typecheck
npm run build
```

再检查：

- `/api/tools` 返回三个工具。
- `/api/tools/run` 可以调用 `read_file`。
- 错误输入会返回失败结果。
- 没有新增模型调用、写文件、命令执行或 patch。

## 下一章要解决什么

第 4 章会实现最小 Agent Loop：模型生成结构化工具调用，Tool Runner 执行工具，观察结果再回到
模型上下文。
