# 产品化第一步：先让 Coding Agent 不污染用户的仓库

一个 Web AI Coding Agent 要真正可用，第一步不是更强的模型，也不是更多工具，而是工作区隔离。

如果 Agent 直接在用户当前 checkout 上读写文件，任何一次误操作都会和用户手头的修改混在一起。用户无法判断哪些改动来自自己，哪些来自 Agent，也很难回滚、审查和导出结果。

ByteSibyl 的 P1 把这个问题前移解决：用户先登记一个本地 Git 项目，然后为任务创建独立 branch/worktree。Agent 面向这个 Task Workspace 工作，而不是直接修改原始 checkout。

## 为什么选择 Git worktree

Git worktree 有三个适合产品化早期的特点：

1. 它使用真实 Git 语义，不需要复制整个仓库。
2. 每个任务可以对应独立分支，便于审查和回滚。
3. 它和后续 commit、patch、PR 草稿天然衔接。

这比简单复制目录更可靠，也比一开始就引入完整容器沙箱更轻。

## 用户看到什么

P1 之后，右侧栏不再像教学 Lab 那样堆满 provider、trace、context、evaluation、hooks 等内部面板。普通用户主要看到三件事：

- 当前项目和隔离工作区。
- AI 问答输入框与简化运行消息。
- Patch Proposal 的生成、审批和应用动作。

这更接近实际产品中的 AI coding assistant：用户关注任务、结果和批准点，内部机制应当可观察，但不应该压过主流程。

## 它解决了什么

P1 让 ByteSibyl 获得了一个重要产品边界：

- 原始 checkout 不再是 Agent 默认写入目标。
- 文件树、Diagnostics、Patch Preview、Shell Runner 都可以切到 task worktree。
- changed files 可以从 Git status 中读取，后续可用于 commit、PR draft 和审计。
- Project/Workspace metadata 可以成为 workspace-level memory 的基础。

这不是“更炫的 UI”，而是让 Agent 行为有了可恢复的工作对象。

## 它还没有解决什么

工作区隔离不是安全沙箱。

P1 没有实现 Docker sandbox，也没有实现命令级强隔离。如果用户允许 Shell Runner 执行命令，命令仍运行在本机环境中，只是 cwd 指向 worktree。真正的不可信命令隔离需要后续 Sandbox Runner。

P1 也没有实现：

- GitHub OAuth。
- 自动 push 或 merge。
- 自动创建 PR。
- 多用户/多租户隔离。
- 多项目并发调度。

这些能力必须在权限、审计、持久化状态和 sandbox 之后逐步加入。

## 架构取舍

本阶段使用 `data/projects.json` 保存 Project 和 Task Workspace metadata。这不是最终状态存储，但适合产品化初期：

- 可直接查看。
- 易于回滚。
- 不引入数据库迁移复杂度。
- 能让前后端先形成稳定 contract。

等到 Durable State Store 阶段，再把 JSON store 替换为带 schema、migration、locking 和 audit trail 的持久层。

## 对后续阶段的意义

Project Workspace 是后续产品能力的地基：

- Memory 可以按 project/workspace 分层。
- Context Engine 可以知道当前任务边界。
- Tool Governance 可以记录工具在哪个 workspace 执行。
- Sandbox 可以把 worktree mount 到隔离环境。
- PR workflow 可以从 changed files 和 branch 推导出来。

也就是说，P1 不是单独的 Git 功能，而是在定义 Agent 的工作对象。

一个用户真正可用的 coding agent，必须先回答一个朴素问题：它到底在哪里工作？P1 的答案是：在可追踪、可回滚、可审查的 task worktree 中。
