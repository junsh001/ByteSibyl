# Phase 19 工程化路线设计说明

## 背景

Phase 0 到 Phase 18 已经把教学型 Coding Agent 的核心部件串起来：Web UI、工具、Agent Loop、Session、Patch、Approval、Shell、Self-Repair、Model Provider、Diagnostics、Context、Todo、Skills、Hooks、Trace、Eval 和 Subagents。

Phase 19 不继续增加 agent 能力，而是暂停下来回答三个工程问题：

1. 当前仓库哪些东西是主线，哪些是历史残留？
2. 当前 runtime 能力离产品化还有哪些缺口？
3. 下一个会话怎样快速接手，不重复踩坑？

## 目录清理决策

本阶段删除了两个历史原型包：

- `packages/agent`
- `packages/db`

原因：

- `packages/agent` 是早期一体化 agent 原型，包含 DeepSeek client、tool loop、workspace 和 diff。当前主线已经拆分为 `agent-core`、`model-provider`、`tool-system`、`workspace`、`patch-engine` 等包。
- `packages/db` 是早期 SQLite 原型，当前 session、trace、patch、approval、command 和 eval 记录由 `packages/telemetry` 的 JSON `SessionStore` 承担。
- 当前 Server 没有 import 这两个包。它们只残留在 package metadata 和旧 README 中。

`data/` 和 `workspaces/` 没有删除，因为它们是运行时生成目录，并已被 `.gitignore` 忽略。它们不是源代码产物。

## 当前工程边界

```text
Web UI
  -> Server API / SSE
  -> Agent Runtime packages
  -> Workspace Execution packages
```

关键边界保持不变：

- Web 只展示状态和触发 API。
- Server 负责依赖组装、session、路由和事件持久化。
- Agent Core 负责 loop 和 observation 流，不依赖 Web。
- 文件和命令执行仍通过 workspace、patch-engine、shell-runner、permission、hooks。

## 工程化路线

从教学 Lab 到产品，需要把当前“单机可信环境”扩展为“可隔离、可恢复、可审计、多用户”的系统。

优先级建议：

1. **Workspace 与 Git 隔离**：每个任务使用独立 worktree / branch，避免覆盖用户工作区。
2. **强沙箱**：命令执行进入 Docker、Firecracker、gVisor 或受控容器池，而不是只靠进程级限制。
3. **持久存储**：把 JSON `SessionStore` 迁移到 SQLite/Postgres，支持索引、分页、并发和审计。
4. **多轮对话状态**：明确 conversation memory、run memory、workspace memory、long-term memory 的边界。
5. **模型路由与成本控制**：按任务类型选择 mock、cheap、reasoning、reviewer 模型，并记录预算。
6. **Web IDE 性能**：文件树虚拟化、大文件保护、日志分页、Trace lazy loading。
7. **插件与 MCP**：将 tools、skills、hooks、MCP server 都纳入权限和版本管理。
8. **安全审计**：所有文件写入、命令、网络、secret 访问、approval 都要形成可查询审计日志。

## 本阶段前端变化

前端只做阶段性可见变化：

- 顶部阶段标识更新为 Phase 19。
- Agent Chat 提示文案说明当前阶段是工程化路线和交接整理。
- 底部日志副标题更新为 `Phase 19 engineering route`。

没有新增复杂 UI，因为 Phase 19 的主要产物是工程文档和清理。

## 当前边界

Phase 19 是工程路线，不是产品化实施。Docker sandbox、多租户、MCP、插件系统、强持久化和模型路由都在文档中明确为后续工作。
