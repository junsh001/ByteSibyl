# Shell Runner 不是终端，Sandbox 是产品边界

Coding Agent 会运行命令，但产品不能把它当成普通终端。每次命令都要有策略、审计和隔离边界。

P4 为 ByteSibyl 加入 SandboxProvider。当前实现是 local fallback，不是强 Docker sandbox，但它让命令结果开始携带 sandbox policy、文件变化和 diff summary。

## 为什么先做 provider 边界

Docker 在不同机器上的可用性差异很大。直接把产品绑定到 Docker 会让开发和验证变复杂。Provider 边界让系统先稳定：

```text
Shell Route -> ShellRunner -> SandboxProvider -> ShellCommandResult
```

以后替换 Docker provider 时，Web 和 Agent 不需要重写。

## 用户看到什么

命令执行阶段不再只出现在底部日志，而会以 command bubble 进入聊天框。这更接近 IDE 插件体验：用户在对话中看到 Agent 正在运行什么、结果如何。

## 当前限制

local fallback 不能运行不可信代码。真正的强隔离还需要 Docker/namespace provider、资源限制和文件挂载策略。
