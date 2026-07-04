# 让 Coding Agent 听懂编译器反馈

很多 Coding Agent demo 会直接把 terminal 输出塞给模型。这样能跑通，但不够理想。编译器已经知道错误发生在哪个文件、哪一行、哪一列，也知道错误级别和错误码。Agent 不应该只读一大段文本，而应该读结构化 diagnostics。

这就是 LSP Diagnostics 的意义。

## Diagnostics 不是普通日志

普通日志通常是给人看的。Diagnostics 更接近机器可消费的事实：

- 哪个文件出错。
- 第几行第几列出错。
- 错误还是警告。
- 具体 message 是什么。
- 来源是 TypeScript、ESLint 还是其他语言服务。

这些信息非常适合作为 Agent Loop 的 observation。模型不需要猜测错误位置，工具系统可以直接把编译器事实交给它。

## 为什么要先做只读工具

在教学型 Coding Agent 里，最重要的是边界清楚。`get_diagnostics` 只读取诊断，不写文件，不执行命令，不自动应用 patch。

这让权限模型保持简单：

```text
读 diagnostics：允许
写文件：必须 Patch Proposal
应用 patch：必须 Approval
执行命令：必须 Shell Runner
```

如果把 diagnostics 和自动修复混在一起，学习者很难看清 Agent 到底是“观察到了错误”，还是“擅自改了代码”。

## 编译器反馈怎样进入 Web

Web 端展示 diagnostics 的价值不是装饰。它让用户在 Agent 操作前就能看到当前 workspace 的健康状态，也能在应用 patch 后立即确认错误是否减少。

一个好的 Web Coding Agent 不只是聊天框。它应该把文件、命令、diff、approval、diagnostics 和 trace 放到同一个工作台里，让用户知道每一步发生了什么。

## 当前阶段的取舍

Phase 11 使用 TypeScript compiler API 生成 LSP-shaped diagnostics。它还不是持久运行的 `tsserver` 进程，也不支持多语言 LSP。

这个取舍适合教学阶段：我们先把 diagnostics 的数据契约、Server API、Web 展示和 Agent 工具调用打通。等这些边界稳定之后，再优化成真正的 language server client。

## 小结

对 Coding Agent 来说，编译器不是一个被动的报错工具，而是一个高质量反馈源。把 diagnostics 接入 Agent Loop 后，Agent 获得的不再是模糊的失败文本，而是可以定位、可以展示、可以追踪的工程事实。
