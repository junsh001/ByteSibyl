# 仓库目录与无用文件审计

## 结论

当前仓库主线已经从早期的一体化原型迁移到分包式教学架构。本阶段删除了两个不再被当前运行链路使用的历史包：

- `packages/agent`
- `packages/db`

这两个目录曾经有意义，但现在会误导后续开发者，以为项目仍在使用旧的 DeepSeek 一体化 agent 和 SQLite 仓储层。

## `packages/agent` 是什么

`packages/agent` 是早期原型包，职责包括：

- DeepSeek streaming client。
- function calling loop。
- 一组内置工具：读文件、写文件、编辑文件、搜索、运行命令。
- workspace 路径限制。
- line-based diff。

它的问题不是“代码一定错误”，而是和当前教学架构重复：

- 当前模型接入在 `packages/model-provider`。
- 当前 Agent Loop 在 `packages/agent-core`。
- 当前工具注册和 schema 校验在 `packages/tool-system`。
- 当前 workspace 能力在 `packages/workspace`。
- 当前 patch 能力在 `packages/patch-engine`。
- 当前 shell 能力在 `packages/shell-runner`。

因此继续保留 `packages/agent` 会制造两个 agent 内核，破坏教程的阶段边界。

## `packages/db` 是什么

`packages/db` 是早期 SQLite 原型包，基于 `better-sqlite3`，包含：

- projects。
- messages。
- lesson progress。
- xp kv。

当前主线没有使用这套模型。项目的 session、run、patch、approval、command、repair、model call、hook、trace 数据由 `packages/telemetry` 的 `SessionStore` 管理，并写入 `data/session-log.json`。

因此 `packages/db` 在当前阶段是历史残留。真正产品化时仍需要数据库，但应该基于当前 `SessionStore` 的领域模型重新设计，而不是恢复早期 course/game 原型表结构。

## `data/` 是什么

`data/` 是本地运行时目录，不是源代码目录。当前常见文件：

- `data/session-log.json`：`SessionStore` 的 JSON 持久化文件。
- `data/app.db*`：早期 SQLite 实验或本地运行残留。

`data/` 已在 `.gitignore` 和 `.dockerignore` 中排除。它可以在本地删除以重置运行状态，但不应提交。

## `workspaces/` 是什么

`workspaces/` 是本地临时 workspace 目录。当前主线默认 workspace 是 `examples/buggy-ts-project`，也可以通过 `WAC_WORKSPACE_ROOT` 指向其他目录。

`workspaces/` 已被忽略。产品化后应该改成：

- 每个用户独立 workspace root。
- 每个任务独立 git worktree。
- 命令在隔离 sandbox 中执行。
- 任务结束后可以归档、清理或转成 PR。

## `.agents` 和 `.codex`

这两个目录是本地 agent/codex 工具使用的元数据目录，不是当前 Web AI Coding Agent Lab 的 runtime 包。它们只允许作为本地开发辅助上下文，不应成为 Web Server 的业务依赖。

## 清理结果

已完成：

- 删除 `packages/agent`。
- 删除 `packages/db`。
- 移除 `apps/server/package.json` 中的 `@wac/agent` 和 `@wac/db` 依赖。
- 移除 root `package.json` 中无效的 `db:push` 脚本。
- 重写 README，避免继续描述早期 agent/db/game 架构。

保留：

- `data/`：运行时本地状态，忽略。
- `workspaces/`：运行时 workspace，忽略。
- `examples/`：教学和评测用例，保留。
