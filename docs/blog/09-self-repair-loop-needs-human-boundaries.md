# 自修复循环为什么仍然需要人工边界

“测试失败后自动修复”听起来像 coding agent 最吸引人的能力：运行测试、看到错误、修改代码、再验证。真正落地时，危险也在这里。失败信号不等于正确诊断，能生成 Patch 不等于应该写入。

一个可靠的 Self-Repair Loop 至少要拆成几个阶段。

首先是验证。Agent 应该通过受控的 Shell Runner 运行白名单命令，比如 typecheck 或 build。命令需要 timeout、stdout/stderr 捕获和 permission decision。否则一次“自动修复”可能变成任意 shell 执行。

其次是诊断。早期系统不必假装自己有完整理解能力。Phase 9 使用教学用 heuristic，只识别一个已知 TypeScript 错误形态。识别不到就 blocked，而不是猜。

然后是 Patch Proposal。修复结果应该先变成 Diff Preview，让人能看到具体文件、增删行和修改内容。这个步骤把“我准备改什么”从“我已经改了什么”中分离出来。

最后才是审批和应用。即使 proposal 看起来合理，也应该经过 Human-in-the-loop。审批通过只代表允许 apply；真正写入文件仍然是单独动作。这样用户可以在关键边界上停下来。

Self-Repair Loop 的核心不是让 agent 拥有无限自动权力，而是让失败、建议、审批、写入、验证都可见。透明的循环比黑盒自动修复更适合教学，也更接近真实工程系统需要的安全结构。
