# 第 11 章：LSP Diagnostics：把编译器变成反馈源

前面阶段已经让 Agent 能运行命令、生成 Patch Proposal，并在失败后进入自修复循环。Phase 11 加入另一类关键反馈：TypeScript diagnostics。

Diagnostics 的价值在于它比纯 terminal 输出更结构化。它天然包含文件、行号、列号、严重级别和错误信息，适合作为 Agent Loop 的 observation。

## 1. 定义共享数据结构

先在 `packages/shared` 中定义跨层 DTO：

- `WorkspaceDiagnostic`
- `DiagnosticSeverity`
- `DiagnosticsResponse`

这些类型让 Server、Web 和 Tool System 不需要各自发明 diagnostics 格式。

## 2. 新增 lsp-client 包

`packages/lsp-client` 提供 `TypeScriptDiagnosticsClient`：

```text
读取 tsconfig.json
创建 TypeScript Program
收集 options / syntactic / semantic diagnostics
转换为 WorkspaceDiagnostic
```

本阶段使用 TypeScript compiler API，而不是持久 `tsserver` 进程。这样更容易教学和验证，同时保留了 LSP Diagnostics 所需的数据形状。

## 3. 接入 Server API

Server 在 `apps/server/src/lsp` 中创建 diagnostics provider，再注册：

```text
GET /api/diagnostics
```

接口返回：

```json
{
  "diagnostics": [],
  "generatedAt": "2026-07-04T00:00:00.000Z",
  "workspaceRoot": "/path/to/workspace"
}
```

## 4. 注册 get_diagnostics 工具

`packages/tool-system` 中新增只读工具：

```text
get_diagnostics
```

它不接收参数，返回当前 workspace 的 diagnostics。因为它是 `read_only`，不会绕过 Patch Approval 或 Shell Runner。

## 5. Web 展示 diagnostics

Web 的 Agent 侧栏新增 `LSP Diagnostics` 面板：

- 显示 error 数量。
- 显示 diagnostics 总数。
- 支持手动刷新。
- 列表展示 file、line、column、message、severity。
- 点击诊断项打开对应文件。

应用 Patch、自修复启动和重新验证后，Web 会重新请求 `/api/diagnostics`，让修复结果可见。

## 6. 验证

运行：

```bash
npm run typecheck
npm run build
```

再启动 Server，访问：

```bash
curl http://127.0.0.1:8789/api/diagnostics
```

如果示例项目存在 TypeScript 错误，返回结果会包含 `path`、`line`、`column`、`message`、`severity`。如果错误已经被修复，列表会为空，这同样说明 diagnostics 已按当前 workspace 状态刷新。
