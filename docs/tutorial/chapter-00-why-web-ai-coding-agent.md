# 第 0 章：为什么 Web AI Coding Agent 不是 ChatBot

## 本章目标

本章不写运行时代码，而是建立项目方向和阶段边界。Web AI Coding Agent 不是一个带代码主题的聊天框，而是一个能在 workspace 中受控行动的系统：它可以读取文件、选择工具、提出修改、等待审批、运行验证，并留下可复盘的 trace。

完成本章后，仓库应该具备后续阶段所需的治理文件、路线图、架构说明、阶段验收标准、教程草稿、博客草稿和项目专用 skill。

## 为什么需要这个阶段

ChatBot 的主要职责是回答问题。Coding Agent 的职责是完成任务。只要系统开始“行动”，就必须处理普通聊天产品不需要处理的问题：

- workspace 上下文不能无限塞进 prompt，必须选择和压缩。
- tool call 必须结构化，不能只靠模型自由输出。
- 文件修改必须能预览、确认和追踪。
- 命令执行必须分类、限制和超时。
- 长任务必须有 session state。
- 工具失败必须变成 observation，而不是直接崩溃。
- 用户必须能看到 agent 到底做了什么。

因此，Phase 0 先定义规则，而不是先写 Web 页面或 agent loop。

## 参考思想

本项目后续会吸收几类成熟 agent 系统的思想：

- LangGraph：显式 state、node、edge、暂停和恢复。
- OpenAI Agents SDK：tools、guardrails、tracing、human review。
- Claude Code 类 Coding Agent：workspace 工具、shell、权限、hooks、skills、subagents。
- OpenCode：LSP diagnostics 作为 agent 和 Web UI 的反馈源。
- 12-Factor Agents：自己管理 prompt、context 和结构化 tool outputs。

这些参考不会被一次性照搬，而是拆成后续阶段逐步实现。

## 设计思想

项目分成三层：

```text
Web UI
  展示文件树、编辑器、Agent Chat、Todo、日志、Trace、Diff Approval

Server
  管理 session、API、事件流、workspace 和审批路由

Agent Runtime
  管理 context、tool system、agent loop、permission、patch、shell、diagnostics、telemetry
```

这个拆分有一个核心原则：Web 是操作界面，不是 agent 内核。后续实现时，agent core 不能依赖 Web UI，工具系统不能绕过权限层，patch engine 不能静默覆盖文件。

## 核心类型与接口

Phase 0 不实现新的运行时接口，只确定未来接口的归属：

- `packages/shared`：跨 Web、Server、Agent 的 DTO 和事件类型。
- `packages/agent-core`：agent loop、run state、step executor。
- `packages/model-provider`：模型抽象和 provider adapter。
- `packages/tool-system`：工具注册、schema 校验、工具执行结果。
- `packages/workspace`：文件树、读文件、搜索、repo map 输入。
- `packages/patch-engine`：diff、patch proposal、apply、rollback note。
- `packages/shell-runner`：命令分类、执行、timeout、stdout/stderr 捕获。
- `packages/permission`：guardrails、approval、policy。
- `packages/telemetry`：trace、logs、replay、eval 记录。

当前仓库已有一些能力，后续阶段会按这些边界逐步迁移，而不是在 Phase 0 重构运行时代码。

## 本章实现内容

Phase 0 创建或更新以下文件：

- `AGENTS.md`：项目硬规则和阶段纪律。
- `ROADMAP.md`：Phase 0 到 Phase 19 的路线图。
- `docs/PRODUCT_SPEC.md`：产品定位、用户、范围和成功标准。
- `docs/ARCHITECTURE.md`：目标架构和依赖规则。
- `docs/BLOG_PLAN.md`：中文教程和中文博客的写作计划。
- `docs/milestones/phase-00-governance.md`：Phase 0 验收标准。
- `skills/web-ai-coding-agent/SKILL.md`：项目专用阶段工作流。
- `docs/tutorial/chapter-00-why-web-ai-coding-agent.md`：本教程章节。
- `docs/blog/00-web-ai-coding-agent-is-not-chatbot.md`：对应中文博客。

## Web 页面效果

Phase 0 没有 Web 页面变化。这是阶段边界的一部分：Web + Server 壳子属于 Phase 1。

## Agent 执行示例

Phase 0 没有 agent 执行示例。最小 agent loop 会在后续阶段实现。当前阶段只要求项目规则明确、文档齐全、验证命令能跑通。

## 验收方式

运行：

```bash
npm run typecheck
```

这个命令用于确认新增治理和文档文件没有破坏现有 TypeScript 项目。

同时检查：

- `AGENTS.md` 是否禁止提前实现未来阶段。
- `ROADMAP.md` 是否覆盖 Phase 0 到 Phase 19。
- `skills/web-ai-coding-agent/SKILL.md` 是否定义“代码 + 文档 + 教程 + 博客”的同步流程。
- `docs/tutorial/` 和 `docs/blog/` 下的阶段产物是否使用中文。

## 当前局限

- 还没有新的 Web IDE 布局。
- 还没有 workspace 文件系统工具。
- 还没有 Tool System。
- 还没有 Agent Loop。
- 还没有 Patch Engine、Approval 或 Shell Runner。

这些能力会在后续阶段逐步实现。

## 下一章要解决什么

第 1 章会实现 Web + Server 骨架：让浏览器里出现文件树占位、编辑器占位、Agent 面板、日志面板，并让 Server 提供 health check、session 创建接口和事件类型基础。
