# Agent Loop：从一次回答到持续观察

## 问题背景

一个会调用工具的系统，还不一定是 Agent。真正的 Agent 需要在工具返回结果后继续决定下一步。

这就是 Agent Loop 的价值：模型不是只回答一次，而是在工具和 observation 之间循环。

## 常见误区

第一个误区，是把工具调用当成终点。模型调用 `read_file` 后，真正重要的是它如何理解文件内容并
决定下一步。

第二个误区，是过早接真实模型。真实模型 API 会带来鉴权、流式、function calling 格式和错误
处理复杂度。教学项目应该先把 loop 本身跑通。

第三个误区，是工具失败就让程序崩溃。工具失败也应该成为 observation，让模型有机会调整策略。

## 核心设计思想

最小 Agent Loop 可以写成：

```text
while not done:
  response = model(messages, tools)
  if response has tool call:
    result = run tool
    messages.append(observation)
  else:
    final answer
```

Phase 4 的实现就是这个结构。

## 最小实现

本阶段新增：

- `packages/model-provider`：定义模型抽象和 mock provider。
- `packages/agent-core`：实现 `runAgentLoop()`。
- `POST /api/agent/run`：以 SSE 返回 agent 事件。
- Web Agent 面板：输入任务并展示 loop 事件。

mock provider 会先搜索 `formatUser`，再读取命中文件，最后输出 final answer。

## 运行效果

用户输入“查找 formatUser 并读取相关文件”，底部日志会出现：

```text
agent.iteration 1/6
tool_call search_text {"query":"formatUser"}
tool_result search_text ok=true
agent.iteration 2/6
tool_call read_file {"path":"src/index.ts"}
tool_result read_file ok=true
agent.done final
```

这说明系统已经从“手动调用工具”变成了“模型驱动工具观察循环”。

## 工程取舍

使用 mock provider 是有意的。它让项目先验证 Agent Loop 的结构，而不是陷入某个模型厂商的
API 细节。

本阶段也没有实现持久化 session。run state 会在 Phase 5 单独处理。

## 总结

Agent Loop 是 Coding Agent 的心跳。Tool System 让动作变得结构化，Agent Loop 让动作结果
能继续影响下一步决策。Phase 4 跑通的是最小循环，后续真实模型、session state、patch 和
shell runner 都会接在这个循环上。
