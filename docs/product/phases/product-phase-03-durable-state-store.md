# Product Phase 03: Durable State Store

## Product Goal

把已有 JSON SessionStore 升级为产品化 durable state 边界：sessions、runs、tasks、patches、approvals、commands、model calls、hooks、memory 都可重启后恢复，并提供分页读取能力。

## User Value

- 刷新页面后可以恢复最近 session 和聊天记录。
- 长 session 不需要一次加载所有 run/trace。
- Product Task、memory summary 和审计记录有统一查询入口。

## Allowed Scope

- 扩展 shared contracts。
- 扩展 SessionStore snapshot schema。
- 增加 task/memory 记录。
- 增加 session list、task list、log/trace 分页 API。
- 不新增数据库依赖，保留 JSON store 作为本阶段 durable adapter。

## Forbidden Scope

- 不引入 SQLite/Postgres 生产依赖。
- 不实现账号、多租户或团队权限。
- 不实现后台队列。
- 不改变 Patch/Approval 安全流程。

## Required Artifacts

- Phase file、设计文档、中文教程、中文博客。
- Runtime durable state code。
- Web 恢复最近 session/task 的 UI。

## Architecture Impact

### Memory

新增 `MemoryRecord`，覆盖 conversation、run、workspace、project、user_preference scope。本阶段只写入简短 summary，不做检索增强。

### Tool Governance

工具结果继续入 run events，并可通过 task/chat 记录恢复。

### Context Lifecycle

不改变 Context Engine。Memory summary 尚未进入 prompt retrieval。

### Skills / Plugins / MCP

无变化。

### Security and Sandbox

状态持久化不改变权限边界。

## Web UI Requirements

- 启动后恢复最近 session。
- 聊天框展示持久化 task messages。
- Trace/log 支持分页 API。

## Acceptance Criteria

1. 重启后 sessions/runs/tasks/patches/approvals/commands 仍在 JSON store 中。
2. `/api/sessions` 可列出 session。
3. `/api/tasks` 可列出 task。
4. session log 和 trace 支持 limit/offset。

## Validation Commands

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

## Smoke Tests

- 创建 session/task。
- 运行 agent。
- 刷新页面恢复聊天记录。
- 请求 `/api/sessions/:id/log?limit=20&offset=0`。

## Migration and Rollback

旧 `data/session-log.json` 缺少 tasks/memories 字段时按空数组加载。回滚只影响新增字段读取。

## Documentation Requirements

- `docs/design/product-phase-03-durable-state-store.md`
- `docs/tutorial/product-phase-03-durable-state-store.md`
- `docs/blog/product-phase-03-durable-state-store.md`

## Remaining Risks

- JSON store 不是最终数据库。
- 没有并发写锁。
- Memory 还没有检索策略。
