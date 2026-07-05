# Phase 12 设计说明：Context Engine

Phase 12 把“模型看到什么”从隐式拼接变成显式的 Context Engine。它不改变工具执行、文件写入、审批或 Shell Runner 的边界，只负责在模型调用前构造受预算控制的 context summary。

## 架构

新增 `packages/context-engine`：

- 输入：当前任务、已有 model/tool messages、工具列表、workspace tree、diagnostics。
- 输出：`ContextSummary` 和一条 system context message。

Server 负责把 workspace tree 和 diagnostics provider 注入 Context Engine。Agent Core 在每次调用 model provider 前执行：

```text
build context summary
emit agent.context_summary
insert context system message
call model provider
```

Web 只展示最近一次 context summary 的状态，不参与上下文构造。

## Context 内容

Context summary 包含：

- 当前任务摘要。
- repo map。
- 当前 diagnostics。
- 相关文件列表。
- 最近 tool observation 摘要。
- 被压缩的旧 observation 数量。
- budget 使用情况。

相关文件优先级：

1. 当前 diagnostics 指向的文件。
2. 用户任务中显式提到的文件路径。
3. 最近 observation 中出现的文件路径。
4. repo map 中与任务关键词匹配的文件。

## Budget 控制

本阶段使用字符预算，默认 `6000`，可通过 `CONTEXT_BUDGET_CHARS` 配置。超过预算时按顺序收缩：

1. repo map。
2. observation summary。
3. diagnostics。
4. relevant files。
5. 最后截断 context message。

Context summary 会记录 `usedChars`、`maxChars` 和 `truncated`，便于 Web 与 session log 观察。

## 当前边界

本阶段没有实现 embedding、向量检索、长期记忆、Todo Planner 或 Trace Replay。Context Engine 只处理当前 run 内的上下文摘要和预算控制。

## 前端变化

Agent 侧栏新增 `Context Engine` 面板，展示最近一次 context summary 的预算使用、相关文件数量、压缩 observation 数量和任务摘要。底部日志会显示 `context_summary` 事件。
