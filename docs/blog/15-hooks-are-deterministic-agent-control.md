# Hooks 是 Coding Agent 的确定性控制层

很多 Agent 安全问题不是因为模型“不知道规则”，而是因为规则只存在于 prompt 里。Prompt 能影响模型输出，但不能保证运行时行为一定被拦截。

Hooks 的价值就在这里：把关键控制点放回代码路径。

## Prompt 不是边界

我们可以在 system prompt 中写：

> 不要修改 `.env`，不要执行危险命令。

这当然有用，但它不是强制边界。模型可能误判，工具层也可能新增了 prompt 没覆盖的能力。一个学习型 Coding Agent Lab 需要把这种差异讲清楚：模型负责提出计划，运行时负责执行规则。

## Hooks 控制什么

Phase 15 引入的 Hooks 覆盖三个关键位置：

- 工具调用前后。
- 文件编辑前后。
- 命令执行前后。
- Session 和 Agent Run 生命周期。

例如，`beforeFileEdit` 会阻止 `.env` 和 `.env.*` 文件编辑。这个检查发生在读取和生成 Patch 之前，所以它不是 UI 提示，也不是模型建议，而是运行时拦截。

命令执行后，`afterCommandRun` 会把 stdout/stderr 压缩成摘要写入 trace。这让后续分析可以看到命令结果，但不会把完整终端输出无限堆进上下文。

## Hooks 和权限系统的关系

Hooks 不是 Permission、Approval 或 Guardrails 的替代品。

更准确地说：

- Permission 决定某类动作是否需要审批或禁止。
- Approval 让人类参与高风险动作。
- Shell Runner 校验命令是否允许执行。
- Hooks 在执行路径上做额外的确定性检查和记录。

这些层不是互斥的。好的 Agent 系统通常需要多层边界，因为单点规则很容易被遗漏。

## 为什么 Hook 失败不能拖垮 Session

Hook 本身也是代码，也可能有 bug。如果一个观测型 Hook 因为摘要格式化失败就让整个 Session 崩溃，学习体验会很差。

因此本阶段的 Hook Registry 会捕获 Hook 异常，记录 `status: "error"`，但不让异常直接中断 Session。真正的安全边界仍然由 Permission、Approval 和 Shell Runner 负责。

## Trace 让控制可见

Hooks 的另一个作用是教学可见性。Web UI 会展示 Hook 总数、阻断数量和最近 Hook 记录。学习者可以看到一次 Patch 或命令背后发生了哪些检查，而不是只看到一个成功或失败结果。

这也是构建 Coding Agent Lab 的重点：不只是让 Agent “能跑”，还要让它为什么能跑、在哪里被拦截、哪些输出进入上下文都变得可观察。

## 小结

Hooks 把 Agent 控制从模型文本移到运行时路径。它们让系统能够在工具、文件和命令边界上做确定性判断，并把判断结果写入 trace。

对 Coding Agent 来说，这是一条重要分界线：从“相信模型会遵守规则”，走向“让系统保证规则被执行”。
