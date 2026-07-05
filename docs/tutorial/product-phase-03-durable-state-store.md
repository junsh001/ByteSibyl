# Product Phase 03 教程：让任务状态可以恢复

P3 的目标是把教学阶段的 session log 变成产品化 durable state 边界。

## 1. 扩展 shared contracts

新增 `ProductTask`、`MemoryRecord`、`SessionListResponse`、分页信息等类型。Web 和 Server 都通过这些 DTO 通信。

## 2. 扩展 SessionStore

`packages/telemetry/src/index.ts` 继续使用 JSON 文件，但 snapshot 增加：

```ts
tasks?: ProductTask[];
memories?: MemoryRecord[];
```

加载旧文件时使用空数组兜底。

## 3. 增加分页

Session log 和 trace 支持：

```text
limit
offset
```

这让 Web 可以先加载最近记录，避免长任务一次性渲染全部事件。

## 4. Web 恢复最近 session

前端启动时调用 `/api/sessions`，拿到最近 session 后再读取 log 和 trace，并从 `tasks.messages` 恢复聊天记录。

## 验证

运行：

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

## 边界

P3 不引入 SQLite/Postgres。真正的数据库 schema、migration、锁和索引留给后续工程化阶段。
