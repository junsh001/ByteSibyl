# Approval 不是一个按钮，而是一个状态机

很多 Agent 产品会把 approval 做成一个简单按钮：同意或拒绝。这个界面看起来直观，但如果底层没有
状态机，系统很快会失控。

一个可靠的 coding agent 需要回答：

- 这次操作为什么需要 approval？
- 它有没有通过 guardrails？
- 用户批准的是哪一份 patch？
- 批准后是否已经真正 apply？
- 拒绝后是否还能被误用？

这些问题都不是按钮能单独解决的。

## Permission 先于 Approval

Approval 的前一步应该是 permission decision。系统先判断操作属于哪类 permission：

- 读 workspace：可以直接允许。
- 写 patch：需要 Human-in-the-loop。
- 执行命令：当前阶段拒绝。
- Forbidden action：直接拒绝。

这样 approval 不会变成万能通行证。用户不能批准一个系统已经判定 forbidden 的动作。

## Guardrails 是硬边界

Guardrails 不是提醒文字，而是硬边界。比如空 patch、过大的 patch、危险路径，都应该在 approval
之前被拦截。

这能避免一种常见错误：UI 让用户批准了一个根本不该进入审批流的动作。

## Patch Proposal 的生命周期

Phase 7 中，一个 patch proposal 可能经历：

```text
proposed -> waiting_approval -> approved -> applied
proposed -> waiting_approval -> rejected
proposed -> blocked
proposed -> discarded
```

`approved` 和 `applied` 必须分开。批准只是授权，apply 才是写入文件。把它们混在一起，会让日志和
排错变得很困难。

## 为什么不做命令审批

命令执行比文件写入更危险，因为它涉及进程、超时、stdout/stderr、环境变量和退出码。Phase 7 只
实现 patch write approval，命令审批留到 shell runner 阶段。

这不是功能缺失，而是边界清晰：先把文件写入的审批状态机做对，再扩展到命令。

## 一个可教学的 Agent 应该能解释自己

当用户问“为什么这个 patch 没有应用？”时，系统应该能回答：

- guardrails 拦截了它；
- 还在等待 approval；
- 已被拒绝；
- 已批准但尚未 apply；
- 已经 applied。

这就是 approval state machine 的价值。它把 Agent 的动作从一段黑盒自动化，变成可以审计、可以
解释、可以恢复的流程。
