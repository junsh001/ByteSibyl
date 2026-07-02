# Web AI Coding Agent 不是 ChatBot

## 问题背景

很多 AI Coding 项目都会从一个聊天框开始：用户输入需求，模型返回代码或解释。这个起点没有问题，但如果系统只停留在“问一句、答一句”，它仍然是一个 ChatBot，而不是 Coding Agent。

Coding Agent 的关键区别在于：它不只是生成答案，而是能在一个真实 workspace 里行动。它需要读取文件、搜索代码、运行验证命令、理解错误、提出修改、等待用户确认，再继续验证结果。只要系统开始“行动”，工程复杂度就会立刻上升。

这也是本项目要从 Phase 0 开始先建立治理规则的原因。我们不是先堆功能，而是先定义边界：哪些能力属于 Web，哪些属于 Server，哪些属于 Agent Runtime，哪些行为必须被权限系统拦住。

## 常见误区

第一个误区，是把整个仓库塞进 prompt。小 demo 里这样做看起来能跑，但真实项目会很快撞上上下文窗口、噪音和成本问题。Coding Agent 需要自己的 Context Engine，按任务选择相关文件、压缩观察结果、保留当前错误和修改线索。

第二个误区，是让模型自己决定安全边界。模型可以提出计划，但不能成为权限系统。文件写入、命令执行、依赖安装、危险 shell pattern，都应该由确定性的 Permission、Approval 和 Guardrails 控制。

第三个误区，是让 agent 静默改代码。对教学型 Coding Agent 来说，修改必须是可解释、可预览、可拒绝、可追踪的。Patch Engine、Diff Preview、Approval 和 Trace 不是装饰，而是系统可信度的一部分。

## 核心设计思想

Web AI Coding Agent 至少包含两层：

```text
Web UI：展示文件、编辑器、聊天、任务计划、日志、diff 和审批
Agent Runtime：负责上下文、工具、循环、权限、验证、诊断和追踪
```

Web UI 是操作界面，不是 agent 内核。Server 负责 session、API、事件流和 workspace 管理。Agent Core 负责模型、工具、观察和停止条件。Tool System 负责把自然语言意图变成结构化动作。Permission 层负责判断动作能不能执行。

这个拆分让后续每一章都能聚焦一个问题，而不是把所有复杂度混在一个“大模型调用函数”里。

## 最小实现

Phase 0 不实现运行时能力，只建立项目治理基线：

- `AGENTS.md`：定义项目硬规则，禁止提前实现未来阶段。
- `ROADMAP.md`：列出 Phase 0 到 Phase 18 的阶段路线。
- `docs/PRODUCT_SPEC.md`：说明产品范围和不做什么。
- `docs/ARCHITECTURE.md`：说明 Web、Server、Agent Runtime 的边界。
- `docs/BLOG_PLAN.md`：定义博客系列和中文写作规范。
- `docs/milestones/phase-00-governance.md`：定义阶段 0 的验收标准。
- `skills/web-ai-coding-agent/SKILL.md`：定义后续阶段的执行流程。

这些文件看起来不是“功能”，但它们决定后续功能不会失控。

## 运行效果

Phase 0 没有 Web 页面变化，也没有新的 agent 行为。它的运行效果体现在工程流程上：

```bash
npm run typecheck
```

这个命令必须通过，说明新增治理文档没有破坏现有 TypeScript 项目。后续每个阶段也必须有自己的验证方式，不能只靠“看起来写完了”。

## 工程取舍

从治理文件开始会显得慢，尤其是当前仓库已经有可运行的 agent、Web UI 和沙箱能力。但如果目标是写一个教程型项目，而不是继续堆 demo，阶段边界就很重要。

这个项目后续会逐步把已有能力拆成更清晰的模块，例如 Agent Core、Tool System、Workspace、Patch Engine、Shell Runner、Permission 和 Telemetry。Phase 0 的价值，是给这些迁移提供判断标准：什么时候该拆、拆到哪里、哪些功能不能提前做。

## 总结

ChatBot 的核心是回答，Coding Agent 的核心是受控行动。只要 agent 能读文件、改代码、跑命令，就必须面对上下文、权限、审批、验证和可观察性。

所以本系列的第一步不是接模型，也不是写 agent loop，而是建立规则。只有边界清楚，后面的 Web AI Coding Agent 才能一步一步变成一个可学习、可验证、可复盘的系统。
