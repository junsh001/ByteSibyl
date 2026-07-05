# 第 12 章：Context Engine：控制模型看到什么

前面的阶段已经让 Agent 可以读文件、运行工具、接入 diagnostics 和真实模型。接下来要处理一个更核心的问题：模型每次调用前，到底应该看到什么？

如果直接把整个仓库、所有工具结果和所有历史消息塞进模型，很快会遇到三个问题：

- 上下文窗口被浪费。
- 旧 observation 干扰当前任务。
- 关键错误和相关文件被噪声淹没。

Phase 12 用 Context Engine 把这件事显式化。

## 1. 定义 ContextSummary

先在 `packages/shared` 中定义 `ContextSummary`，它包含：

- `taskSummary`
- `repoMap`
- `relevantFiles`
- `diagnostics`
- `observationSummary`
- `compressedObservationCount`
- `budget`

这样 Web、Server、Agent Core 可以用同一种结构观察上下文构造结果。

## 2. 新增 context-engine 包

`packages/context-engine` 的职责是：

```text
输入当前任务、消息历史、工具列表、workspace tree、diagnostics
输出 context summary 和 system context message
```

它不会读取 API key，不会执行命令，也不会修改文件。

## 3. 选择相关文件

本阶段用确定性规则选择相关文件：

1. diagnostics 中出现的文件优先。
2. 用户任务里显式写出的文件路径优先。
3. 最近 observation 中出现的文件路径优先。
4. repo map 中匹配任务关键词的文件作为补充。

这不是智能检索，但足够教学：先让上下文选择规则可观察、可解释，再考虑 embedding 和索引。

## 4. 压缩旧 observation

Agent Loop 中的 tool observation 可能越来越多。Context Engine 只保留最近几条摘要，并记录旧 observation 被压缩了多少条。

这样模型还能知道“之前有历史工具结果”，但不会被全部原文挤占预算。

## 5. 控制预算

默认预算是 `6000` 字符，可通过环境变量配置：

```bash
CONTEXT_BUDGET_CHARS=4000
```

当 context 超出预算时，Context Engine 会依次缩小 repo map、observation summary、diagnostics 和 relevant files，最后才截断文本。

## 6. 接入 Agent Loop

Agent Core 在每次 model call 前执行：

```text
contextEngine.build(...)
yield agent.context_summary
model.complete(...)
```

因此 Web 和 session log 都能看到模型调用前的 context summary。

## 7. Web 展示

Web 的 Agent 侧栏新增 `Context Engine` 面板：

- 显示预算使用。
- 显示相关文件数量。
- 显示被压缩 observation 数量。
- 显示当前任务摘要。

底部日志也会出现 `context_summary` 事件，方便观察每次模型调用前上下文是否变化。

## 8. 验证

运行：

```bash
npm run typecheck
npm run build
```

然后启动 Server，运行 Agent Loop。日志中应先出现 `context_summary`，再出现 `model_call`。
