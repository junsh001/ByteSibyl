# Product Phase 04 设计说明：Sandbox Runner

P4 引入 `SandboxProvider` 边界，让命令执行不再只是“本地 spawn”，而是通过可替换 provider 返回带策略的执行结果。

## 当前实现

当前 provider 是 `LocalSandboxProvider`，它是受控本地降级：

- 不通过 shell 执行。
- 禁止 shell 操作符。
- 保留白名单、安全分类、超时、输出限制。
- 不注入 secrets。
- 记录执行前后 Git changed files。
- 记录 `git diff --stat` summary。

## ShellCommandResult

新增 `sandbox` 字段：

```ts
sandbox: {
  provider: 'local',
  mode: 'local_fallback',
  policy,
  beforeChangedFiles,
  afterChangedFiles,
  diffSummary,
  message
}
```

## 为什么不声称 Docker 已完成

当前环境不保证 Docker 可用，且自动安装 Docker 不属于本阶段。P4 完成的是架构边界和可审计 metadata，强隔离 provider 后续替换。

## 风险

local fallback 不是安全沙箱，不能运行不可信命令。它只是在产品 UI 和状态层先建立 sandbox 语义。
