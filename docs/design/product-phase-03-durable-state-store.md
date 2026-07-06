# Product Phase 03 设计说明：Durable State Store

P3 没有引入新的数据库依赖，而是在现有 JSON `SessionStore` 上建立产品化 durable state 边界。这样可以在不改变部署复杂度的前提下，让 session、run、task、patch、approval、command、model call、hook 和 memory 都能重启恢复。

## 核心设计

`SessionStoreSnapshot` 新增：

- `tasks`
- `memories`

旧 JSON 文件没有这些字段时按空数组加载，因此兼容已有数据。

## API

新增：

```text
GET /api/sessions
GET /api/tasks?sessionId=<id>
GET /api/sessions/:id/log?limit=80&offset=0
GET /api/sessions/:id/trace?limit=80&offset=0
```

`limit/offset` 是 P3 的最小 lazy loading 边界，避免大 session 一次把所有 run 和 trace timeline 拉到前端。

## Memory

新增 `MemoryRecord`，包含 `conversation`、`run`、`workspace`、`project`、`user_preference` scope。当前实现只写入简短 summary，用于审计和后续检索设计，不参与 prompt 构建。

## 限制

- JSON store 不是最终数据库。
- 没有 SQLite migration。
- 没有并发写锁。
- Memory 只记录，不检索。
