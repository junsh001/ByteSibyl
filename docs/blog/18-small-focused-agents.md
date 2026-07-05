# Small Focused Agents：为什么要拆分 Subagents

一个 Coding Agent 可以什么都做：理解任务、读文件、写 patch、跑命令、审查结果。但什么都做也意味着边界不清楚。

Subagents 的价值不是让系统显得更复杂，而是让职责和权限更明确。

## 单 Agent 的问题

单 Agent 很容易把这些事情混在一起：

- Planner 在规划时顺手建议修改文件。
- Coder 在写 patch 时跳过审批。
- Reviewer 在审查时尝试执行危险命令。

如果所有角色都共享同一个 prompt 和同一组权限，系统很难解释“谁可以做什么”。

## 三个最小角色

一个实用的最小组合是：

- planner：只读，负责拆任务。
- coder：准备 patch，但 apply patch 需要 approval。
- reviewer：只读，负责审查 diff 和验证结果。

这三个角色不需要一开始就并行执行。先把角色和权限边界建起来，比直接做复杂多 Agent 更重要。

## Subagents 不是绕过权限

Subagent 不能绕过已有系统边界。

Coder 说“我要 apply patch”，仍然必须经过 Patch Engine、Permission、Approval 和 Hooks。Reviewer 想运行命令，也仍然必须经过 Shell Runner。

角色权限只是第一层约束，底层安全机制仍然有效。

## 只传 Summary

Subagent 的另一个关键点是上下文隔离。

主 session 不应该拿到每个 subagent 的完整内部上下文。更好的方式是：subagent 输出结构化 summary，主 Agent 只接收 summary。

这降低了上下文污染，也让 Trace 更清楚：主会话看到的是“planner/coder/reviewer 的结论”，不是所有中间思考。

## 什么时候需要真正并行

并行 subagents 适合更复杂的场景，例如大型代码库、多文件重构、独立 reviewer 审查。但在教学项目中，第一步应该是最小角色机制：

- 角色定义。
- 权限定义。
- Summary 事件。
- Web 可见性。

这些基础稳定后，再做并行执行才有意义。

## 小结

Subagents 的核心不是“更多 Agent”，而是“更清楚的边界”。Planner 只读规划，Coder 准备 patch，Reviewer 只读审查。这样的分工让 Coding Agent 更容易解释、审计和扩展。
