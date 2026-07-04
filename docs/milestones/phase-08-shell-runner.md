# Phase 8: Shell Runner

## 目标

实现最小 Shell Runner，让系统可以在 workspace 内执行白名单安全命令，并捕获 stdout、stderr、exit
code、signal、timeout 和 permission decision。

## 允许范围

- 新增 `packages/shell-runner`。
- 定义 Shell command request/result 的共享契约。
- Shell Runner 使用 `spawn(file, args)`，不使用 shell 字符串解释。
- 命令执行必须经过 permission policy。
- 支持安全命令白名单。
- 支持 timeout。
- 支持 stdout/stderr 截断。
- Server 暴露 shell run API。
- `SessionStore` 持久化 command history。
- Web 展示 Shell Runner 输入、结果、状态和命令历史。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现命令 approval。
- 不执行 risky command。
- 不实现交互式终端。
- 不实现 long-running background job。
- 不实现 self-repair loop。
- 不把 shell runner 接入 Agent Loop 自动调用。
- 不接入真实模型 API。
- 不新增生产依赖。

## 必需产物

- `packages/shell-runner`
- `packages/shared/src/index.ts`
- `packages/permission/src/index.ts`
- `packages/telemetry/src/index.ts`
- `apps/server/src/routes/shell.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/index.css`
- `docs/design/phase-08-shell-runner.md`
- `docs/tutorial/chapter-08-shell-runner.md`
- `docs/blog/08-shell-runner-is-not-a-terminal.md`

## 验收标准

1. Server 可以执行白名单安全命令。
2. Shell Runner 不通过 shell 解释器执行命令。
3. 含 pipe、redirect、logical operator 的命令会被阻断。
4. 执行结果包含 stdout、stderr、exit code、timeout 和 duration。
5. Command history 写入 Session Log。
6. Web 可以运行安全命令并显示结果。
7. 没有实现命令 approval、self-repair 或 Agent 自动调用 shell。

## 验证命令

```bash
npm run typecheck
npm run build
```
