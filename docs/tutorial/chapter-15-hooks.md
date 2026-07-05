# 第 15 章：Hooks

本章实现一个最小但可用的 Hooks 系统。它的目标不是再写一层 prompt，而是在代码运行路径上增加确定性的检查点。

## 1. 定义共享 Hook Contract

先在 `packages/shared` 中加入 Hook 类型：

- `HookPhase` 描述 Hook 所处阶段。
- `HookStatus` 描述执行结果。
- `HookRecord` 是 trace 中保存的记录。
- `ToolResult.hooks` 允许工具结果携带 Hook 记录。
- `SessionLogResponse.hooks` 让 Web 可以读取持久化 Hook。

本阶段使用的 phase 包括 `onSessionStart`、`beforeToolCall`、`afterToolCall`、`beforeFileEdit`、`afterFileEdit`、`beforeCommandRun`、`afterCommandRun` 和 `onAgentStop`。

## 2. 新增 `packages/hooks`

创建独立包：

```text
packages/hooks
├── package.json
├── tsconfig.json
└── src/index.ts
```

`HookRegistry` 暴露几个方法：

- `beforeToolCall`
- `afterToolCall`
- `beforeFileEdit`
- `afterFileEdit`
- `beforeCommandRun`
- `afterCommandRun`
- `onSessionStart`
- `onAgentStop`

每个方法返回 `HookExecution`，其中包含 `records`、`blocked` 和可选的 `message`。

Session 创建后会写入 `onSessionStart` 记录；Agent Loop 停止时会写入 `onAgentStop` 记录。这样一轮运行的生命周期边界也能进入 trace。

## 3. 实现文件编辑前拦截

`beforeFileEdit` 检查目标路径：

```ts
function isSensitivePath(path: string): boolean {
  const normalized = path.replaceAll('\\', '/').split('/').at(-1) ?? path;
  return normalized === '.env' || normalized.startsWith('.env.');
}
```

当用户尝试修改 `.env` 或 `.env.local` 这类文件时，Hook 返回 `blocked`。Patch Preview 和 Patch Apply 都会调用这个 Hook，因此敏感文件不会进入后续编辑流程。

## 4. 接入 Tool System

`ToolRunner.run` 在工具执行前调用 `beforeToolCall`。如果 Hook 返回阻断记录，就直接返回失败的 `ToolResult`，并把 Hook 记录放进 `result.hooks`。

工具运行结束后，`afterToolCall` 会记录工具是否成功。Agent Route 在保存 `agent.tool_result` 时，会把其中的 Hook 记录写入 Session Store。

## 5. 接入 Shell Runner

Shell Route 在执行命令前调用 `beforeCommandRun`，执行后调用 `afterCommandRun`。后者会把 stdout/stderr 压缩为一行摘要：

```text
stdout=...; stderr=...
```

这样 trace 中既能看到命令运行状态，也能看到输出摘要，而不需要把完整终端输出塞进每个 Hook 记录。

## 6. 持久化 Hook Trace

`packages/telemetry` 增加 Hook 存储：

- `saveHookRecord`
- `saveHookRecords`
- `getSessionLog` 返回当前 Session 的 Hook 列表

Hook 记录按 `createdAt` 排序返回给 Web。

## 7. Web 展示 Hooks

Web 右侧 Agent 面板新增 Hooks 区块：

- `Recorded` 显示 Hook 总数。
- `Blocked` 显示阻断次数。
- 最近 Hook 列表显示 `status`、`phase` 和 `subject`。

Session State 增加 Hooks 计数，底部 Trace Log 会输出最近 Hook 详情。这样学习者可以直接看到一次命令或 Patch 操作经过了哪些确定性控制点。

## 8. 验证

运行：

```bash
npm run typecheck
npm run build
```

然后启动服务并做两个烟测：

1. 使用 `/api/patches/preview` 尝试修改 `.env`，应返回 403。
2. 使用 `/api/shell/run` 执行安全命令，再读取 Session Log，应该能看到 `afterCommandRun` 的 stdout/stderr 摘要。

## 小结

Phase 15 把 Agent 控制从“模型应该遵守”推进到“运行时必须检查”。Hooks 不替代 Permission 或 Approval，而是在关键执行点提供可组合、可追踪、可教学的确定性控制层。
