# 做产品化前，先把规则换掉

一个教学项目完成后，最危险的事情不是“功能不够”，而是继续用教学项目的规则开发产品。

Web AI Coding Agent Lab 已经完成 Phase 0 到 Phase 19。它能解释 Agent Loop、Tool System、Patch、Approval、Shell、Context、Trace、Eval、Skills、Hooks 和 Subagents。

但产品化不是继续堆一个 Phase 20。

产品化需要先回答：用户能不能把真实项目交给它？出错了能不能回滚？命令在哪里跑？Memory 存在哪里？工具权限谁说了算？Skill 和 MCP 会不会绕过审计？

这就是 P0：Product Baseline。

## 教学规则不等于产品规则

教学阶段的核心问题是：

```text
这个 Agent 机制如何工作？
```

产品阶段的核心问题是：

```text
用户把真实项目交给它是否安全、可控、可恢复？
```

所以 P0 先修改治理规则，而不是先写 Git worktree 或 Docker sandbox。

## 双轨：Lab 和 Product

新的规则把项目分成两条轨道：

- Tutorial Lab track：Phase 0-19，保留为历史教学路线。
- Productization track：P0-P12，按产品能力推进。

这样后续开发不会混淆：

- 教程阶段关注“讲清楚机制”。
- 产品阶段关注“用户价值和风险边界”。

## 产品化阶段仍然要写教程和博客

一个重要决定是：产品化阶段仍然必须产出教程和博客。

但格式要变。

教程不再只是“如何实现某个教学模块”，而是：

- 如何实现这个产品能力。
- 如何验证。
- 如何迁移。
- 如何回滚。
- 风险在哪里。

博客也不再是普通知识文章，而是产品工程文章：

- 用户为什么需要这个能力。
- 当前 Lab 为什么不够。
- 架构怎么选。
- 安全边界是什么。
- 发布和限制是什么。

## 每个产品阶段都必须看五个影响面

P0 的模板要求后续每个阶段都写：

1. Memory。
2. Tool Governance。
3. Context Lifecycle。
4. Skills / Plugins / MCP。
5. Security and Sandbox。

这不是形式主义。

Coding Agent 的风险通常不是单点风险，而是组合风险：模型拿到了过多上下文，调用了权限过大的工具，跑了未隔离命令，又把结果写进了不可恢复的工作区。

产品化阶段必须把这些组合风险拆开看。

## 为什么 P1 是 Workspace 隔离

产品化路线的第一个实际阶段是 P1：Project Workspace & Git Isolation。

原因很简单：没有 workspace 隔离，就不应该扩大自动编辑能力。

用户的原始 checkout 必须被保护。Agent 应该在独立 branch 或 worktree 中工作，用户批准后再决定如何导出 patch、commit 或 PR。

这是从 demo 到产品的第一道边界。

## P0 没有新增运行时能力

P0 不实现：

- Git worktree。
- Docker sandbox。
- Durable database。
- Multi-file patch。
- Team auth。

这不是遗漏，而是边界。

P0 做的是把后续开发的规则、路线、模板和验收标准准备好，让 P1 可以直接开工。

## 总结

产品化的第一步不是写更多功能，而是换掉开发规则。

ByteSibyl 现在有了新的产品化基线：每个产品阶段仍然写代码、设计文档、中文教程和中文博客，但必须同时说明用户价值、风险边界、Memory、Tool、Context、Skill、安全、Web UI、验证和迁移。

这套规则准备好后，真正的产品化开发才算开始。
