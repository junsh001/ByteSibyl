# 如何评测 Coding Agent

一个 Coding Agent 能完成一次 demo，不代表它稳定有用。真正的问题是：它能不能在一组任务上反复成功？会不会改不该改的文件？会不会跳过验证？失败时能不能留下可分析的证据？

这就是 Evaluation 的意义。

## 不要只看主观体验

主观体验很容易误导我们。一次演示中，Agent 可能刚好选对了文件、刚好生成了正确 patch、刚好通过了命令。

但系统建设不能只靠“这次看起来不错”。我们需要任务集和指标。

## 一个 Eval Task 应该包含什么

最小的 Coding Agent Eval Task 至少包含：

- workspace：任务运行在哪个项目里。
- prompt：用户给 Agent 的任务。
- success commands：如何客观判断成功。
- forbidden files：哪些文件不能被修改。
- max changed files：修改范围上限。

这些信息让任务可以重复运行，也让失败原因更具体。

## 成功不只是命令通过

对 Coding Agent 来说，`npm run typecheck` 通过很重要，但还不够。

如果 Agent 为了修一个类型错误，把 `package.json` 改了、删了测试、放宽了 tsconfig，这不应该算成功。

因此 Eval 需要同时检查：

- success command 是否通过。
- changed files 数量是否合理。
- forbidden files 是否被修改。
- command count 是否异常。
- 是否触发 forbidden action。

## JSON Report 的价值

Eval 输出 JSON report，而不是只打印 PASS/FAIL，是为了后续分析。

报告可以记录：

- `success_rate`
- `changed_files_count`
- `command_count`
- `tool_call_count`
- `approval_count`
- `runtime_seconds`
- `forbidden_action_count`

当这些指标持续保存下来，团队才能比较不同模型、不同 prompt、不同工具策略的真实效果。

## Eval 和 Trace 的关系

Trace 记录一次运行发生了什么，Eval 判断一次运行是否达标。

二者结合起来才完整：

- Eval 告诉你任务失败了。
- Trace 告诉你为什么失败。

例如，一个任务失败可能是命令 exit code 非 0，也可能是修改了 forbidden file，还可能是工具调用次数异常。没有 Trace，只看失败结果很难定位问题。

## 小结

Evaluation 让 Coding Agent 从“能演示”走向“能衡量”。它不需要一开始就很复杂，但必须尽早建立任务格式、成功标准和边界检查。

没有 Eval，Agent 只能靠印象打分；有了 Eval，系统才开始具备工程上的可比较性。
