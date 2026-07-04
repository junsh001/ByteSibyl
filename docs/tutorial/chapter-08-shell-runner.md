# 第 8 章：Shell Runner

本章实现最小 Shell Runner。它让系统可以运行安全验证命令，并把输出记录到 Session Log。这里的
重点不是做一个完整终端，而是建立可控命令执行边界。

## 1. 定义共享契约

在 `packages/shared` 中加入：

- `ShellCommandRequest`
- `ShellCommandResult`
- `ShellCommandResponse`
- `ShellCommandSafety`
- `ShellCommandStatus`

结果里包含 stdout、stderr、exit code、timeout、duration 和 permission decision。

## 2. 更新 permission policy

Phase 7 中命令执行全部拒绝。Phase 8 开始允许 `execute_safe`：

```text
safe -> execute_safe -> allow
risky -> execute_risky -> deny
forbidden -> forbidden -> deny
```

命令 approval 还没有实现，因此 risky command 不会进入审批流。

## 3. 创建 shell-runner 包

新增 `packages/shell-runner`。核心类是 `ShellRunner`：

```text
new ShellRunner({ workspaceRoot }).run({ command, timeoutMs })
```

Runner 会：

1. 解析命令字符串为 argv。
2. 检查 shell operator。
3. 分类 safe/risky/forbidden。
4. 调用 permission policy。
5. 对 safe command 使用 `spawn()` 执行。
6. 捕获 stdout/stderr。
7. 超时后终止进程。

## 4. Server API

新增 `apps/server/src/routes/shell.ts`：

```text
POST /api/shell/run
```

如果请求带 `sessionId`，执行结果会写入 `SessionStore`。

## 5. Web UI

Agent Chat 中新增 Shell Runner 面板：

- 命令输入框。
- 运行安全命令按钮。
- status/safety 展示。
- stdout/stderr 输出。

底部 log 会显示最近 command history。

## 6. 验证

运行：

```bash
npm run typecheck
npm run build
```

手动测试：

- `node --version` 应该执行成功。
- `npm run typecheck` 会作为安全命令执行。
- `rm -rf .`、`npm install`、`node --version && echo ok` 应该被阻断。

## 本章边界

Phase 8 不做命令 approval，不做交互式终端，不把 shell 自动接入 Agent Loop。自动读取 typecheck 失败
并生成 patch 的流程属于 Phase 9。
