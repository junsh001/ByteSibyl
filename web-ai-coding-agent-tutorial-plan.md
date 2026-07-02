# Web AI Coding Agent 从 0 到 1：教程章节安排与代码阶段开发计划

> 项目定位：实现一个面向 Web AI Coding 的教学型 Coding Agent 内核。目标不是复刻 Claude Code、Codex、OpenCode 的完整商业能力，而是把 agent loop、工具系统、上下文工程、权限控制、代码编辑、命令执行、LSP 诊断、评测与工程治理这些核心思想拆开实现，并形成可发布的教程与博客系列。

---

## 0. 设计依据与参考映射

本计划参考以下资料与工具体系，并将其转化为适合自研 Web AI Coding Agent 的工程路线。

| 参考来源 | 主要启发 | 本项目吸收方式 |
|---|---|---|
| DeepLearning.AI：AI Agents in LangGraph | 从零实现 agent，再用 LangGraph 重构，理解 agent loop 的底层机制 | 先手写最小 agent loop，再逐步抽象状态与节点，而不是一上来套框架 |
| LangChain Academy / LangGraph | state、node、edge、durable execution、memory、human-in-the-loop | 把 agent session 设计成显式状态机，支持暂停、恢复、人工确认、长任务 trace |
| Hugging Face Agents Course | tools、smolagents、multi-agent、observability、evaluation | 强调工具调用、执行轨迹、评测任务，不只做 demo |
| OpenAI Agents SDK | tools、handoff、guardrails、tracing、approval、human review | 设计工具 schema、审批中断、guardrails、trace timeline |
| Claude Agent SDK / Claude Code | 文件读取、命令执行、编辑、权限、hooks、skills、subagents | 参考 coding agent 的真实工程能力边界，但先做单 agent 内核 |
| OpenCode | LSP diagnostics 作为 agent 反馈源，terminal / IDE / desktop 多入口 | Web 端展示诊断、diff、执行日志；后端接入 LSP diagnostics |
| 12-Factor Agents | own prompts、own context、tools as structured outputs、human contact、small focused agents | 所有工具结构化；上下文由系统控制；权限和人工确认不依赖模型自觉 |

---

## 1. 项目目标

### 1.1 最终目标

构建一个 Web AI Coding Agent Lab：

```text
用户在 Web 页面输入任务
  ↓
Agent 创建任务计划
  ↓
读取项目文件、搜索代码、收集上下文
  ↓
运行 typecheck / test / build
  ↓
根据错误生成 patch
  ↓
Web 端展示 diff
  ↓
用户确认 apply
  ↓
再次验证
  ↓
输出修改总结、测试结果、风险说明
```

### 1.2 核心能力范围

必须实现：

1. Web IDE 基础界面：文件树、编辑器、Agent Chat、任务状态、日志、diff 预览。
2. Agent Runtime：agent loop、工具系统、状态机、上下文工程。
3. Workspace 工具：读文件、搜代码、获取文件树、生成 diff、应用 patch。
4. Shell Runner：运行测试、构建、类型检查，并带权限控制。
5. LSP Diagnostics：把语言服务错误作为 agent 的反馈源。
6. Guardrails / Approval：危险命令、写文件、依赖安装必须审批。
7. Trace / Eval：记录每轮工具调用、模型输出、文件修改、命令结果。
8. 教程与博客：每个阶段必须有代码成果、设计说明、教程章节、博客草稿。

暂不实现：

1. 云端多租户沙箱。
2. 完整 VS Code 替代品。
3. 自动 git push / 自动 PR。
4. 大规模多 agent 并行。
5. MCP marketplace。
6. 支持所有语言。
7. 自动长期后台执行。

---

## 2. 推荐技术栈

### 2.1 前端

```text
Vue 3 或 React + TypeScript
Monaco Editor
xterm.js
WebSocket 或 SSE
状态管理：Pinia / Zustand / Redux Toolkit
Diff 展示：Monaco DiffEditor 或 react-diff-view
```

建议你优先选择与你当前 ByteSibyl 方向一致的技术栈：**Vue 3 + TypeScript + Monaco + xterm.js**。

### 2.2 后端

```text
Node.js + TypeScript
Fastify / Hono / NestJS 三选一
WebSocket / SSE
child_process / node-pty
LSP client
SQLite 起步，后续 PostgreSQL
```

### 2.3 Agent 内核

```text
agent-core        Agent 主循环
model-provider    OpenAI / Anthropic / 本地模型适配
tool-system       工具注册、schema 校验、权限分发
workspace         文件树、读文件、搜索、项目索引
patch-engine      diff、patch、apply、rollback note
shell-runner      命令执行、超时、stdout/stderr 捕获
context-engine    repo map、上下文预算、相关文件选择
planner           Todo / Task 状态机
lsp-client         diagnostics 获取
permission        approval / guardrail / policy
telemetry         trace、session replay、eval log
shared            前后端共享类型
```

---

## 3. 总体架构

```text
web-ai-coding-agent/
├── apps/
│   ├── web/                  # Web IDE 前端入口
│   ├── server/               # Agent API、WebSocket/SSE、workspace 会话
│   └── cli/                  # 调试入口，不是主产品入口
│
├── packages/
│   ├── agent-core/           # Agent loop、run state、step executor
│   ├── model-provider/       # 模型抽象层
│   ├── tool-system/          # Tool schema、registry、runner
│   ├── workspace/            # 文件系统、搜索、repo map 原始数据
│   ├── patch-engine/         # diff、patch、apply、rollback
│   ├── shell-runner/         # 命令执行、权限、超时
│   ├── context-engine/       # 上下文构建、压缩、预算控制
│   ├── planner/              # Todo 状态机
│   ├── lsp-client/           # LSP diagnostics
│   ├── permission/           # guardrail、approval、policy
│   ├── telemetry/            # trace、logs、replay、eval
│   └── shared/               # DTO、event、schema、type
│
├── docs/
│   ├── design/               # 架构设计文档
│   ├── tutorial/             # 教程章节
│   ├── blog/                 # 博客草稿
│   └── milestones/           # 阶段任务单
│
├── examples/
│   ├── buggy-ts-project/
│   ├── mini-react-app/
│   └── node-cli-bug-demo/
│
├── skills/
│   └── web-ai-coding-agent/
│       └── SKILL.md
│
├── AGENTS.md
├── ROADMAP.md
└── package.json
```

核心约束：

```text
Web 只负责展示与用户交互。
Server 只负责 session、API、事件推送、workspace 管理。
Agent Core 不依赖 Web，也不直接依赖具体模型。
Tool System 不允许绕过 Permission 层。
Patch Engine 不允许静默覆盖文件。
Shell Runner 不允许执行未分类命令。
```

---

## 4. Web 产品形态

第一版 Web 页面只需要五块：

```text
左侧：Workspace 文件树
中间：Monaco Editor
右侧：Agent Chat + Todo Plan
底部：Terminal / Command Log / Trace Log
弹窗：Diff Preview + Approval
```

最小交互闭环：

```text
1. 用户打开 example 项目。
2. 文件树加载。
3. 用户输入：修复 TypeScript 类型错误。
4. Agent 运行 npm run typecheck。
5. Agent 读取错误并定位文件。
6. Agent 生成 patch。
7. Web 展示 diff。
8. 用户点击 Apply。
9. Agent 再次运行 typecheck。
10. Web 展示通过结果与总结。
```

---

## 5. 教程系列总目录

系列名：**从 0 到 1 构建 Web AI Coding Agent**

| 章节 | 教程主题 | 代码阶段 | 主要思想 |
|---|---|---|---|
| 第 0 章 | 为什么 Web AI Coding Agent 不是 ChatBot | Phase 0 | 产品定位、系统边界、学习路线 |
| 第 1 章 | Web IDE 壳子：文件树、编辑器、Agent 面板 | Phase 1 | Web 是交互层，不是 agent 内核 |
| 第 2 章 | Workspace：Agent 的眼睛 | Phase 2 | 文件系统工具、项目结构、搜索 |
| 第 3 章 | Tool System：把自然语言变成结构化动作 | Phase 3 | tools as structured outputs |
| 第 4 章 | Agent Loop：模型—工具—观察循环 | Phase 4 | ReAct / loop / observation / stop condition |
| 第 5 章 | Session State：从一次问答到有状态任务 | Phase 5 | LangGraph 式状态、可暂停、可恢复 |
| 第 6 章 | Patch Engine：安全改代码 | Phase 6 | diff、patch、apply、rollback |
| 第 7 章 | Approval 与 Guardrails：Agent 不能随便执行 | Phase 7 | 权限、审批、中断、恢复 |
| 第 8 章 | Shell Runner：运行测试并读取失败 | Phase 8 | 命令执行、超时、stdout/stderr、错误压缩 |
| 第 9 章 | 自修复循环：失败后继续定位与修复 | Phase 9 | run → error → edit → verify |
| 第 10 章 | LSP Diagnostics：把编译器变成反馈源 | Phase 10 | diagnostics、行号、类型错误、IDE 级反馈 |
| 第 11 章 | Context Engine：控制上下文窗口 | Phase 11 | repo map、相关文件选择、压缩 |
| 第 12 章 | Todo Planner：任务状态机 | Phase 12 | todo_write、状态迁移、blocked |
| 第 13 章 | Skills：复用工作流 | Phase 13 | SKILL.md、项目规则、任务模板 |
| 第 14 章 | Hooks：确定性拦截与自动化 | Phase 14 | before/after tool、审计、策略执行 |
| 第 15 章 | Trace 与 Replay：让 Agent 可观察 | Phase 15 | tracing、logs、session replay |
| 第 16 章 | Eval：如何判断 Agent 真的有用 | Phase 16 | benchmark、成功标准、越权检测 |
| 第 17 章 | Subagents：什么时候需要多 Agent | Phase 17 | planner/coder/reviewer、上下文隔离 |
| 第 18 章 | 从教学项目到工程产品 | Phase 18 | 部署、沙箱、多租户、插件化路线 |

---

## 6. 代码阶段开发计划

### Phase 0：治理文件与项目规范

**目标**：先约束项目，而不是先写业务代码。

允许创建：

```text
AGENTS.md
ROADMAP.md
docs/PRODUCT_SPEC.md
docs/ARCHITECTURE.md
docs/BLOG_PLAN.md
docs/milestones/phase-00-governance.md
skills/web-ai-coding-agent/SKILL.md
```

禁止：

```text
不写 Web 代码
不写 Server 代码
不接模型
不实现 agent loop
```

验收：

```text
1. 所有治理文件存在。
2. ROADMAP 明确所有阶段。
3. AGENTS.md 明确禁止跳阶段。
4. SKILL.md 明确“代码 + 文档 + 博客”同步产出流程。
```

教程产物：

```text
docs/tutorial/chapter-00-why-web-ai-coding-agent.md
docs/blog/00-web-ai-coding-agent-is-not-chatbot.md
```

---

### Phase 1：Web + Server 骨架

**目标**：搭建 Web AI Coding 的最小壳子。

代码产物：

```text
apps/web
apps/server
packages/shared
```

实现内容：

```text
1. Web 页面布局：文件树占位、编辑器占位、Agent 面板、日志面板。
2. Server health check。
3. Agent session 创建接口。
4. SSE/WebSocket 事件类型定义。
5. shared 包定义 SessionId、AgentEvent、WorkspaceFileNode 等类型。
```

禁止：

```text
不实现文件读写
不实现 agent loop
不实现命令执行
不实现 patch
```

验收命令：

```bash
npm run typecheck
npm run build
```

教程产物：

```text
docs/design/phase-01-web-server-shell.md
docs/tutorial/chapter-01-web-shell.md
docs/blog/01-web-ai-coding-shell.md
```

---

### Phase 2：Workspace 文件系统

**目标**：让 Web 能看到真实项目，让 Agent 后续有“眼睛”。

代码产物：

```text
packages/workspace
apps/server/src/routes/workspace.ts
apps/web/src/features/workspace
```

工具：

```text
list_files
read_file
search_text
get_workspace_tree
```

实现内容：

```text
1. 加载指定 workspace 根目录。
2. 构建文件树。
3. 点击文件后读取内容。
4. 搜索文本。
5. 限制路径不能逃逸 workspace。
```

验收：

```text
1. Web 能展示 example 项目文件树。
2. 点击文件能显示内容。
3. search_text 能返回路径、行号、片段。
4. 无法读取 workspace 外部路径。
```

教程产物：

```text
docs/tutorial/chapter-02-workspace-tools.md
docs/blog/02-agent-needs-workspace-tools.md
```

---

### Phase 3：Tool System

**目标**：把工具从普通函数升级为 agent 可调用的结构化能力。

代码产物：

```text
packages/tool-system
packages/shared/src/tool.ts
```

核心接口：

```ts
export interface Tool<I, O> {
  name: string;
  description: string;
  schema: unknown;
  permission: ToolPermission;
  run(input: I, context: ToolContext): Promise<O>;
}
```

实现内容：

```text
1. Tool Registry。
2. Tool Runner。
3. Tool input schema 校验。
4. Tool result 标准结构。
5. 将 list_files/read_file/search_text 注册为工具。
```

验收：

```text
1. 工具可以通过 name 调用。
2. 错误参数会被拒绝。
3. 工具调用结果会记录到 trace。
4. 前后端共享 ToolCall / ToolResult 类型。
```

教程产物：

```text
docs/tutorial/chapter-03-tool-system.md
docs/blog/03-tools-are-structured-outputs.md
```

---

### Phase 4：Agent Loop 最小实现

**目标**：实现模型—工具—观察循环。

代码产物：

```text
packages/agent-core
packages/model-provider
apps/server/src/routes/agent.ts
```

实现内容：

```text
1. ModelProvider 抽象。
2. AgentRunState。
3. while-loop 执行器。
4. 支持工具调用。
5. 支持 maxIterations。
6. 支持 final answer。
7. 将 agent event 推送到 Web。
```

第一版模型可以使用 mock provider，避免一开始被真实 API 复杂度影响。

验收：

```text
1. 用户输入任务后，Agent 可以调用 read_file/search_text。
2. Web 能显示每次工具调用。
3. 达到 maxIterations 会停止。
4. 出现 tool error 会进入 observation，而不是崩溃。
```

教程产物：

```text
docs/tutorial/chapter-04-agent-loop.md
docs/blog/04-model-tool-observation-loop.md
```

---

### Phase 5：Session State 与长任务控制

**目标**：把 agent run 从一次性函数变成可追踪状态机。

代码产物：

```text
packages/agent-core/src/run-state.ts
packages/telemetry/src/session-store.ts
apps/web/src/features/agent-run
```

实现内容：

```text
1. Session 状态：created/running/paused/waiting_approval/completed/failed/cancelled。
2. Step 状态：model_call/tool_call/tool_result/approval/final。
3. 支持暂停和取消。
4. 支持 session log 落盘。
```

验收：

```text
1. Web 可以看到 run 状态变化。
2. Agent run 可以被取消。
3. 每一步都有可追溯记录。
4. session log 可被重新读取。
```

教程产物：

```text
docs/tutorial/chapter-05-agent-session-state.md
docs/blog/05-agent-needs-state.md
```

---

### Phase 6：Patch Engine 与 Diff Preview

**目标**：让 agent 可以提出修改，但不能静默覆盖代码。

代码产物：

```text
packages/patch-engine
apps/web/src/features/diff-preview
```

工具：

```text
propose_patch
apply_patch
reject_patch
```

实现内容：

```text
1. 生成 unified diff。
2. Web 展示 before/after。
3. 用户确认后 apply。
4. 记录 patch history。
5. apply 失败时输出冲突信息。
```

验收：

```text
1. Agent 能提出 patch。
2. Web 能显示 diff。
3. 用户确认后才写入文件。
4. 文件修改可在 trace 中看到。
```

教程产物：

```text
docs/tutorial/chapter-06-patch-engine.md
docs/blog/06-safe-code-editing-for-agents.md
```

---

### Phase 7：Permission、Approval 与 Guardrails

**目标**：实现工具权限体系。

代码产物：

```text
packages/permission
packages/tool-system/src/approval.ts
apps/web/src/features/approval
```

权限等级：

```text
read_only       list_files/read_file/search_text
write_patch     propose_patch/apply_patch
execute_safe    npm test/npm run typecheck
execute_risky   npm install/git checkout
forbidden       rm -rf/sudo/curl | sh/git push
```

实现内容：

```text
1. 工具调用前检查 permission。
2. 需要审批时进入 waiting_approval。
3. Web 展示审批卡片。
4. 用户 approve/reject 后 run 继续。
5. forbidden 命令直接拒绝。
```

验收：

```text
1. apply_patch 默认需要审批。
2. 危险命令不会执行。
3. 审批通过后 agent 可以 resume。
4. 审批拒绝后 agent 能收到 observation 并调整策略。
```

教程产物：

```text
docs/tutorial/chapter-07-approval-and-guardrails.md
docs/blog/07-agents-need-permission-boundaries.md
```

---

### Phase 8：Shell Runner

**目标**：让 agent 可以运行验证命令。

代码产物：

```text
packages/shell-runner
apps/web/src/features/terminal-log
```

工具：

```text
run_command
```

实现内容：

```text
1. 执行安全命令。
2. 捕获 stdout/stderr。
3. 设置 timeout。
4. 记录 exit code。
5. 命令输出进入 observation。
6. Web 展示命令日志。
```

验收：

```text
1. Agent 可以运行 npm run typecheck。
2. timeout 生效。
3. exit code 非 0 时不会崩溃。
4. stdout/stderr 会被压缩后回传给 agent。
```

教程产物：

```text
docs/tutorial/chapter-08-shell-runner.md
docs/blog/08-let-agent-run-tests-safely.md
```

---

### Phase 9：测试失败后的自修复循环

**目标**：实现 coding agent 的第一个完整闭环。

场景：

```text
example/buggy-ts-project 中有一个 TypeScript 错误。
用户输入：修复 typecheck 错误。
Agent 运行 typecheck → 定位错误 → 生成 patch → 用户确认 → 再运行 typecheck → 通过。
```

实现内容：

```text
1. 错误日志压缩。
2. 基于错误定位相关文件。
3. patch 后再次验证。
4. 最多重试 3 轮。
5. 最终输出修复报告。
```

验收：

```text
1. example 项目 typecheck 从失败变成功。
2. Agent 修改文件数量可控。
3. 所有动作都有 trace。
4. 失败超过 3 次后停止并输出失败报告。
```

教程产物：

```text
docs/tutorial/chapter-09-self-repair-loop.md
docs/blog/09-from-answer-to-repair-loop.md
```

---

### Phase 10：LSP Diagnostics

**目标**：把 IDE 级诊断接入 Agent。

代码产物：

```text
packages/lsp-client
apps/server/src/lsp
apps/web/src/features/diagnostics
```

工具：

```text
get_diagnostics
```

实现内容：

```text
1. 启动 TypeScript language server。
2. 获取 diagnostics。
3. Web 展示错误列表。
4. Agent 将 diagnostics 当作 observation。
5. 修改文件后刷新 diagnostics。
```

验收：

```text
1. Web 显示 TypeScript 错误。
2. Agent 能调用 get_diagnostics。
3. 诊断包含 file、line、column、message、severity。
4. 修改后 diagnostics 会更新。
```

教程产物：

```text
docs/tutorial/chapter-10-lsp-diagnostics.md
docs/blog/10-compiler-feedback-for-coding-agents.md
```

---

### Phase 11：Context Engine

**目标**：控制上下文窗口，避免把整个仓库塞给模型。

代码产物：

```text
packages/context-engine
```

实现内容：

```text
1. Repo map。
2. 当前任务摘要。
3. 最近 observation 摘要。
4. 相关文件选择。
5. 错误日志压缩。
6. context budget 控制。
```

验收：

```text
1. 每次模型调用前输出 context summary。
2. context 不超过配置预算。
3. 当前错误和相关文件优先进入上下文。
4. 旧 observation 会被压缩。
```

教程产物：

```text
docs/tutorial/chapter-11-context-engine.md
docs/blog/11-own-your-context-window.md
```

---

### Phase 12：Todo Planner

**目标**：让 agent 的任务计划显式化。

代码产物：

```text
packages/planner
apps/web/src/features/todo-panel
```

工具：

```text
todo_write
todo_update
todo_read
```

实现内容：

```text
1. TodoItem：pending/in_progress/done/blocked。
2. Web 展示任务列表。
3. Agent 每次阶段转换时更新 todo。
4. blocked 时说明原因。
```

验收：

```text
1. Agent 执行任务前创建 plan。
2. 当前步骤可见。
3. 完成后标记 done。
4. 阻塞时不会伪装成功。
```

教程产物：

```text
docs/tutorial/chapter-12-todo-planner.md
docs/blog/12-todo-is-agent-state-machine.md
```

---

### Phase 13：Skills

**目标**：把一次性提示词沉淀成可复用工作流。

代码产物：

```text
packages/skills
.skills/typescript-debug/SKILL.md
.skills/react-refactor/SKILL.md
.skills/tutorial-writing/SKILL.md
```

实现内容：

```text
1. Skill manifest 解析。
2. 根据任务选择 skill。
3. 将 skill 指令注入 context。
4. Web 显示当前使用的 skill。
```

验收：

```text
1. TypeScript debug 任务会加载 typescript-debug skill。
2. Skill 不直接执行命令，只提供流程与规则。
3. Skill 变更可被 trace 记录。
```

教程产物：

```text
docs/tutorial/chapter-13-skills.md
docs/blog/13-skills-turn-prompts-into-workflows.md
```

---

### Phase 14：Hooks

**目标**：实现确定性拦截，而不是完全依赖模型自律。

代码产物：

```text
packages/hooks
```

事件：

```text
onSessionStart
beforeToolCall
afterToolCall
beforeFileEdit
afterFileEdit
beforeCommandRun
afterCommandRun
onAgentStop
```

实现内容：

```text
1. Hook registry。
2. beforeToolCall 可拒绝工具。
3. afterCommandRun 可触发日志压缩。
4. beforeFileEdit 可检查敏感文件。
5. Hook 结果写入 trace。
```

验收：

```text
1. 试图修改 .env 会被 hook 拦截。
2. 运行命令后自动记录 stdout/stderr 摘要。
3. Hook 执行失败不会破坏 session。
```

教程产物：

```text
docs/tutorial/chapter-14-hooks.md
docs/blog/14-hooks-are-deterministic-agent-control.md
```

---

### Phase 15：Trace、Replay 与 Observability

**目标**：让 agent 行为可观察、可复盘。

代码产物：

```text
packages/telemetry
apps/web/src/features/trace-viewer
```

实现内容：

```text
1. ModelCallTrace。
2. ToolCallTrace。
3. FileEditTrace。
4. CommandTrace。
5. ApprovalTrace。
6. Session replay 页面。
```

验收：

```text
1. Web 可以按时间线查看 agent 行为。
2. 每次文件修改都有前后证据。
3. 每次命令都有 exit code。
4. 可以导出 session trace JSON。
```

教程产物：

```text
docs/tutorial/chapter-15-trace-and-replay.md
docs/blog/15-observability-for-coding-agents.md
```

---

### Phase 16：Evaluation

**目标**：建立评测任务，避免只靠主观体验。

代码产物：

```text
packages/eval
examples/eval-tasks
```

任务格式：

```json
{
  "id": "ts-typecheck-001",
  "workspace": "examples/buggy-ts-project",
  "prompt": "Fix the TypeScript typecheck error.",
  "successCommands": ["npm run typecheck"],
  "forbiddenFiles": ["package.json"],
  "maxChangedFiles": 3
}
```

指标：

```text
success_rate
changed_files_count
command_count
tool_call_count
approval_count
runtime_seconds
forbidden_action_count
```

验收：

```text
1. 至少 5 个 eval task。
2. 可以批量运行。
3. 输出 JSON report。
4. 能检测是否修改 forbidden files。
```

教程产物：

```text
docs/tutorial/chapter-16-evaluation.md
docs/blog/16-how-to-evaluate-coding-agents.md
```

---

### Phase 17：Subagents

**目标**：在单 agent 内核稳定后，加入最小多角色机制。

子 agent：

```text
planner   只读，负责拆任务
coder     可写，负责 patch
reviewer  只读，负责审查 diff 和验证结果
```

实现内容：

```text
1. 每个 subagent 有独立 system prompt。
2. 每个 subagent 有独立权限。
3. planner/reviewer 默认 read_only。
4. coder 需要 approval 才能 apply patch。
5. 主 session 只接收 subagent summary。
```

验收：

```text
1. planner 不可写文件。
2. reviewer 不可执行危险命令。
3. coder 修改后 reviewer 能审查 diff。
4. subagent 上下文不污染主 session。
```

教程产物：

```text
docs/tutorial/chapter-17-subagents.md
docs/blog/17-small-focused-agents.md
```

---

### Phase 18：工程化路线

**目标**：总结从教学项目到产品的差距。

讨论内容：

```text
1. Docker sandbox。
2. 多 workspace。
3. 多用户隔离。
4. Git 分支与 worktree。
5. 模型路由。
6. 成本控制。
7. Web IDE 性能。
8. 插件系统。
9. MCP 接入。
10. 安全审计。
```

教程产物：

```text
docs/tutorial/chapter-18-from-lab-to-product.md
docs/blog/18-from-web-ai-coding-agent-lab-to-product.md
```

---

## 7. 每章固定写作模板

每个教程章节使用统一结构：

```text
1. 本章目标
2. 为什么 Web AI Coding Agent 需要这个模块
3. 对应参考：LangGraph / OpenAI Agents SDK / Claude Code / OpenCode / 12-Factor Agents
4. 设计思想
5. 核心类型与接口
6. 关键代码实现
7. Web 页面效果
8. Agent 执行示例
9. 验收方式
10. 当前局限
11. 下一章要解决什么
```

每篇博客使用统一结构：

```text
1. 标题
2. 问题背景
3. 常见误区
4. 核心设计思想
5. 最小代码实现
6. 运行效果
7. 工程取舍
8. 总结
```

---

## 8. Codex 开发约束策略

### 8.1 AGENTS.md 核心规则

```md
# AGENTS.md

## Project Goal

Build a learning-oriented Web AI Coding Agent. The project focuses on agent kernel design, not cloning any commercial coding agent.

## Hard Rules

1. Work phase by phase.
2. Do not implement future phases early.
3. Every phase must produce code, design docs, tutorial chapter, and blog draft.
4. Web is the main product entry. CLI is only for debugging.
5. Agent core must not depend on Web UI.
6. Tools must be structured and schema-validated.
7. File writes and command execution must go through permission checks.
8. Dangerous commands are forbidden unless explicitly approved.
9. Do not add production dependencies without explaining the reason.
10. After code changes, run the phase validation command.
11. If validation fails three times, stop and write a failure report.

## Final Report Required

At the end of each phase, report:

1. Files created.
2. Files modified.
3. What was implemented.
4. What documentation was written.
5. Commands run.
6. Validation result.
7. Remaining risks.
8. Next phase.
```

### 8.2 Codex 阶段提示词模板

```text
Use the web-ai-coding-agent skill.

Task:
Complete Phase <N>: <phase name>.

Required reading before editing:
1. AGENTS.md
2. ROADMAP.md
3. docs/ARCHITECTURE.md
4. docs/milestones/phase-<N>.md

Execution rules:
1. Implement only the allowed scope of this phase.
2. Do not implement future phases.
3. Keep patches small and reviewable.
4. Update code, design doc, tutorial chapter, and blog draft together.
5. Run the validation command from the phase file.
6. If validation fails, fix and retry up to 3 times.
7. If still failing, stop and write a failure report.

Final report:
1. Files created.
2. Files modified.
3. What works.
4. Validation result.
5. Remaining risks.
6. Next recommended phase.
```

---

## 9. 开发优先级

### 第一优先级：必须先跑通的核心闭环

```text
Phase 0  治理文件
Phase 1  Web + Server 壳
Phase 2  Workspace 文件系统
Phase 3  Tool System
Phase 4  Agent Loop
Phase 6  Patch Engine
Phase 7  Approval
Phase 8  Shell Runner
Phase 9  自修复循环
```

完成到 Phase 9，你就已经拥有一个最小可用的 Web AI Coding Agent。

### 第二优先级：提高稳定性

```text
Phase 5  Session State
Phase 10 LSP Diagnostics
Phase 11 Context Engine
Phase 12 Todo Planner
Phase 15 Trace / Replay
Phase 16 Eval
```

完成到 Phase 16，你的项目开始从 demo 变成可评测的 agent 系统。

### 第三优先级：扩展能力

```text
Phase 13 Skills
Phase 14 Hooks
Phase 17 Subagents
Phase 18 工程化路线
```

这些应在单 agent 闭环稳定后再做。

---

## 10. MVP 定义

最小可用版本不是完整 IDE，而是这个闭环：

```text
用户输入：修复 TypeScript 类型错误
  ↓
Agent 运行 npm run typecheck
  ↓
读取错误日志
  ↓
搜索相关文件
  ↓
生成 patch
  ↓
Web 展示 diff
  ↓
用户确认 apply
  ↓
再次运行 typecheck
  ↓
输出通过结果和修改总结
```

MVP 完成标准：

```text
1. 有 Web 页面。
2. 有真实文件树。
3. 有 agent loop。
4. 有结构化工具调用。
5. 有 patch preview。
6. 有 approval。
7. 有 shell runner。
8. 有 trace。
9. 有一个 example 项目从失败修到成功。
10. 有对应教程章节和博客草稿。
```

---

## 11. 推荐 Git 分支策略

```text
main
  ├── phase/00-governance
  ├── phase/01-web-server-shell
  ├── phase/02-workspace-tools
  ├── phase/03-tool-system
  ├── phase/04-agent-loop
  └── ...
```

每个阶段一个分支：

```bash
git checkout -b phase/01-web-server-shell
```

每个阶段提交信息：

```bash
git commit -m "feat(phase-01): add web and server shell"
```

禁止 Codex 自动执行：

```bash
git push
git reset --hard
git clean -fd
```

---

## 12. 风险与取舍

### 12.1 最大风险

```text
1. 过早做完整 Web IDE，导致 agent 内核被 UI 拖慢。
2. 过早做多 agent，单 agent loop 还没稳定就复杂化。
3. 工具没有权限层，agent 可以越权写文件或执行危险命令。
4. 没有 eval，最终只能靠主观感觉判断效果。
5. 上下文工程缺失，模型每次都随机找文件。
```

### 12.2 推荐取舍

```text
先做单 workspace。
先支持 TypeScript/JavaScript。
先做本地执行，不做云沙箱。
先人工确认 apply patch，不做全自动写入。
先用 mock model provider 跑通流程，再接真实模型。
先有 trace，再谈优化。
```

---

## 13. 最终交付物

项目最终应该交付三类成果：

### 13.1 代码项目

```text
一个可运行的 Web AI Coding Agent Lab。
```

### 13.2 教程

```text
docs/tutorial/
从 0 到 1 构建 Web AI Coding Agent 的完整教程。
```

### 13.3 博客系列

```text
docs/blog/
可发布到个人博客或技术社区的系列文章。
```

---

## 14. 参考资料

1. DeepLearning.AI, AI Agents in LangGraph：强调先从零构建 agent，再用 LangGraph 重构。
2. LangGraph / LangChain Academy：强调 state、memory、human-in-the-loop、durable execution。
3. Hugging Face Agents Course：强调 tools、smolagents、observability、evaluation。
4. OpenAI Agents SDK：强调 tools、guardrails、tracing、approval、human-in-the-loop。
5. Claude Agent SDK / Claude Code：强调读文件、运行命令、编辑代码、hooks、skills、subagents、权限。
6. OpenCode：强调 coding agent 与 LSP diagnostics 的结合。
7. HumanLayer 12-Factor Agents：强调 own prompts、own context window、tools as structured outputs、small focused agents。

---

## 15. 一句话总结

这个项目不要从“复刻 Claude Code / Codex / OpenCode”开始，而要从一个可解释、可验证、可教学的 Web AI Coding Agent 内核开始：

```text
Web 展示任务过程，Agent Core 执行推理循环，Tool System 连接环境，Permission 控制风险，Trace/Eval 证明效果。
```
