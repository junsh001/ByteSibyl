# Product Phase 04: Sandbox Runner

## Product Goal

让 Shell Runner 通过 SandboxProvider 接口执行命令，记录 sandbox policy、执行前后 changed files 和 diff summary，为后续 Docker/namespace 强隔离打下边界。

## User Value

- 命令执行状态以更接近 IDE 插件的形式展示到聊天记录。
- 用户能看到命令执行使用了什么 sandbox policy。
- 命令结果和文件变化可审计。

## Allowed Scope

- 定义 SandboxProvider 接口。
- 实现 local fallback provider。
- 命令结果记录 sandbox metadata。
- 不注入 secrets。
- 保留现有命令白名单、超时和输出限制。

## Forbidden Scope

- 不声称 local fallback 是强 Docker sandbox。
- 不自动安装 Docker。
- 不允许任意 shell 操作符。
- 不扩大安全命令白名单。

## Required Artifacts

- Phase file、设计文档、中文教程、中文博客。
- Shell Runner sandbox metadata。
- Web 聊天框中的命令消息展示。

## Architecture Impact

### Memory

命令结果可写入 task message；不写长期偏好 memory。

### Tool Governance

命令仍受 permission policy 和 ShellRunner 白名单控制。

### Context Lifecycle

无变化。

### Skills / Plugins / MCP

无变化。

### Security and Sandbox

新增 SandboxProvider 抽象，但当前 provider 是 local fallback。强隔离仍待 Docker provider。

## Web UI Requirements

- 命令执行结果以 command bubble 进入聊天流。
- sandbox 细节保留在 command result/log 中。
- 非核心日志不挤占聊天主内容。

## Acceptance Criteria

1. ShellCommandResult 包含 sandbox metadata。
2. 执行前后 changed files 可记录。
3. 命令超时、输出限制、白名单仍生效。
4. 文档明确 local fallback 限制。

## Validation Commands

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

## Smoke Tests

- 执行 `npm --version` 或 `npm run typecheck`。
- 检查 command result 中有 sandbox 字段。
- 危险 shell 操作符仍被 blocked。

## Migration and Rollback

旧 command result 没有 sandbox 字段时仍可读取。

## Documentation Requirements

- `docs/design/product-phase-04-sandbox-runner.md`
- `docs/tutorial/product-phase-04-sandbox-runner.md`
- `docs/blog/product-phase-04-sandbox-runner.md`

## Remaining Risks

- local fallback 不是强隔离。
- Docker provider 尚未实现为可运行 backend。
