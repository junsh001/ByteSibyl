# Phase 8 Design: Shell Runner

## 背景

前面几个阶段已经具备 workspace 读取、Patch Proposal、approval 和受控 apply。Coding Agent 的下一步
是验证代码，例如运行 typecheck。Phase 8 实现最小 Shell Runner，但它不是完整终端。

## 执行模型

Shell Runner 接收一条命令字符串，但不会把它交给 shell。它会先解析成 argv，然后调用：

```text
spawn(file, args, { shell: false, cwd: workspaceRoot })
```

这意味着 pipe、redirect、`;`、`&&`、command substitution 等 shell 语法不会被执行。

## Permission

命令会先分类：

- `safe`：白名单命令，可以执行。
- `risky`：当前阶段拒绝。
- `forbidden`：直接阻断。

`packages/permission` 在 Phase 8 开始允许 `execute_safe`，但仍拒绝 `execute_risky` 和 `forbidden`。
命令 approval 不在本阶段实现。

## Guardrails

Phase 8 的 guardrails 包括：

- 不允许 shell operator。
- 不允许 command substitution。
- 只在 workspace root 中执行。
- 命令必须命中白名单。
- stdout/stderr 有最大输出限制。
- 命令有 timeout。

## Server API

新增：

```text
POST /api/shell/run
```

请求包含：

- `sessionId`
- `command`
- `timeoutMs`

返回 `ShellCommandResult`，包含 status、safety、stdout、stderr、exitCode、signal、duration 和
permission decision。

## Web UI

Web 的 Agent Chat 区新增 Shell Runner 面板。用户可以输入安全命令，例如：

```text
npm run typecheck
node --version
```

执行结果会显示 status、safety 和输出。Session State 会显示 command 数量，底部 log 会展示 command
history。

## 边界

Phase 8 不把 Shell Runner 接入 Agent Loop 自动调用，也不做 self-repair。Phase 9 才会把 typecheck
failure、patch 和 verification loop 串起来。
