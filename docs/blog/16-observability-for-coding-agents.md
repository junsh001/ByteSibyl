# Coding Agent 为什么需要 Observability

一个 Coding Agent 能跑起来，只说明它完成了动作。要判断它是否可靠，还需要知道它为什么这么做、调用了哪些工具、改了哪些文件、命令结果是什么，以及在哪些地方被审批或拦截。

这就是 Observability 对 Coding Agent 的价值。

## 只看最终回答是不够的

如果 Agent 最后说“修好了”，我们至少还需要追问：

- 它读了哪些文件？
- 它调用了哪个模型？
- 它有没有运行验证命令？
- 命令 exit code 是多少？
- 它修改了哪些行？
- 是否经过审批？
- 是否触发过 Guardrails 或 Hooks？

这些问题不能靠最终自然语言回答解决。最终回答可能遗漏细节，也可能把过程描述错。系统必须记录结构化 Trace。

## Trace 是行为证据

Trace 不是普通日志。普通日志偏向调试系统本身，Trace 更像 Agent 行为证据链。

一条好的 Coding Agent Trace 应该至少包含：

- Model call：请求摘要、响应摘要、token usage、耗时。
- Tool call：工具名、输入、输出摘要、是否成功。
- File edit：修改前后证据、diff、状态。
- Command：命令、cwd、exit code、stdout/stderr 摘要。
- Approval：审批动作、状态、原因。
- Hook：确定性拦截点、结果、摘要。

有了这些记录，用户才能复盘一次 Agent Run，而不是只相信最后一句总结。

## Replay 让时间顺序变清楚

Coding Agent 的行为通常不是一个动作，而是一串动作。它先构建上下文，再问模型，再调用工具，再拿 observation，再决定下一步。

Replay 的作用是把这些动作按时间排列。用户可以一步步查看：

1. Agent 收到任务。
2. Context Engine 生成摘要。
3. Model Provider 返回工具调用。
4. Tool System 执行工具。
5. Patch 或命令进入审批和 guardrails。
6. 最终状态写回 Session。

这种顺序感对教学尤其重要。学习者能看到 Agent 系统不是“一个大模型黑箱”，而是一组可观察的运行时组件。

## 文件修改必须有前后证据

对 Coding Agent 来说，文件修改是高风险动作。只记录“修改了 file.ts”不够，至少要能看到 before/after evidence。

Phase 16 使用 patch hunk 和 unified diff 做证据来源。这比保存完整文件快照更轻，也足够展示修改前后的关键行。

## 命令必须有 exit code

命令输出里最重要的结构化信号通常是 exit code。stdout/stderr 可以很长，但 exit code 能明确告诉系统命令是否成功。

因此 Command Trace 应该把 command、cwd、status、exit code、duration 和输出摘要都记录下来。后续 Evaluation 才能基于这些数据判断任务是否真的通过验证。

## 小结

Observability 让 Coding Agent 从“能执行”走向“能解释、能复盘、能验证”。Trace 和 Replay 不直接提升模型能力，但它们让系统行为变得可信。

没有 Trace，Agent 的成功只是一段文字；有了 Trace，Agent 的成功才有证据链。
