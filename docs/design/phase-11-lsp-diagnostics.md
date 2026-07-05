# Phase 11 设计说明：LSP Diagnostics

Phase 11 的目标是把编译器反馈变成 Web 和 Agent 都能消费的结构化数据。它不是自动修复阶段，也不改变 Patch Approval、Shell Runner 或 Permission 的边界。

## 架构

新增 `packages/lsp-client`，导出 `TypeScriptDiagnosticsClient` 和 `DiagnosticsProvider`。Server 在 `apps/server/src/lsp` 中装配 provider，并通过 `/api/diagnostics` 暴露给 Web。

`packages/shared` 定义跨层 DTO：

- `WorkspaceDiagnostic`
- `DiagnosticSeverity`
- `DiagnosticsResponse`

`packages/tool-system` 注册只读工具 `get_diagnostics`。Agent Loop 看到的 diagnostics 与 Web 面板看到的数据来自同一个 provider。

## 当前实现边界

本阶段使用 TypeScript compiler API 读取 workspace 的 `tsconfig.json`，收集 syntactic、semantic 和 options diagnostics，再转换成 LSP-shaped DTO。这样可以稳定获得 file、line、column、message、severity 和 code。

计划中的“启动 TypeScript language server”在本阶段先落到 compiler-backed provider。持久 `tsserver` 进程、增量缓存、多语言 LSP 和编辑器内联标注属于后续增强。

## 数据流

```text
TypeScript project
  -> TypeScriptDiagnosticsClient
  -> DiagnosticsResponse
  -> /api/diagnostics
  -> Web Diagnostics panel

TypeScriptDiagnosticsClient
  -> ToolRunner context
  -> get_diagnostics
  -> Agent observation
```

## 权限边界

`get_diagnostics` 是 `read_only` 工具。它只读取 TypeScript 编译诊断，不写文件、不执行 shell 命令，也不创建 patch。文件修改仍必须走 Patch Proposal、Approval 和 Apply。

## 前端变化

Agent 侧栏新增 `LSP Diagnostics` 面板，展示错误数、总 diagnostics 数、刷新按钮和最多 8 条诊断。点击诊断会打开对应文件。应用 Patch、自修复启动和重新验证后会刷新 diagnostics。
