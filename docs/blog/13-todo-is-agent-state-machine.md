# Todo 不是清单，是 Agent 的状态机

很多 Agent 产品都会显示一个 Todo List。看起来像 UI 装饰，其实它背后是一个重要问题：Agent 有没有把自己的工作状态说清楚？

如果没有显式 todo，用户只能从聊天和日志里猜 Agent 在做什么。猜测会带来不信任：它到底开始了吗？卡住了吗？真的完成了吗？

## Todo 的核心价值

对 Coding Agent 来说，Todo 至少表达四种状态：

- `pending`：还没开始。
- `in_progress`：当前正在做。
- `done`：已经完成。
- `blocked`：无法继续，需要说明原因。

这四个状态看似简单，但它们把 Agent 的运行过程变成了可观察状态机。

## blocked 比失败更重要

一个可靠 Agent 不应该在失败时继续假装成功。如果命令失败、工具失败、模型调用失败、达到最大迭代次数，它应该明确标记 blocked。

这就是 Human-in-the-loop 的基础：人类只有知道哪里 blocked，才能决定是批准、修改任务、补充上下文，还是停止。

## Todo 不应该只存在前端

如果 Todo 只是前端自己根据日志猜出来的，它就不是 Agent 状态。它应该由 Agent Runtime 更新，再通过事件交给 Web 展示。

Phase 13 的做法是：

```text
Agent Core 更新 TodoPlanner
  -> 发出 agent.todo_updated
  -> Server 持久化到 run event
  -> Web 渲染 Todo Panel
```

这样 UI 只是观察者，不是状态来源。

## 为什么还要 todo 工具

除了 Agent Core 的确定性更新，本阶段也注册了三个结构化工具：

- `todo_write`
- `todo_update`
- `todo_read`

这让模型也可以通过 Tool System 操作计划，而不是在自然语言里随口承诺“我会做三步”。

## 当前阶段的取舍

这个阶段没有做复杂任务分解，也没有做多 agent planner。初始计划是确定性的，目的是让状态迁移清楚、可验证、可教学。

更智能的任务分解可以后续加入，但前提是状态机边界先稳定。

## 小结

Todo Planner 的意义不是多一个列表，而是让 Agent 不再黑箱运行。它必须展示当前步骤，完成后标记 done，卡住时标记 blocked。

当 Agent 能诚实表达状态，用户才有机会真正参与控制。
