# Web AI Coding Agent Lab

Web AI Coding Agent Lab 是一个学习导向的 Web Coding Agent 实验项目。它把 coding agent 的核心机制拆成阶段实现：Workspace、Tool System、Agent Loop、Session State、Patch Engine、Permission、Shell Runner、Self-Repair、Model Provider、LSP Diagnostics、Context Engine、Todo Planner、Skills、Hooks、Trace、Evaluation、Subagents，以及最后的工程化路线。

项目目标不是复刻 Claude Code、Codex、OpenCode 或完整 IDE，而是让读者能在 Web UI 中看到 agent 如何读上下文、调用结构化工具、生成 Patch Proposal、等待 Human-in-the-loop approval、运行验证命令、记录 Trace，并通过 Eval 衡量结果。

## 当前状态

当前主线完成到 Phase 19：工程化路线。

- Web 是主要产品入口。
- Agent Core 独立于 Web UI。
- Shared contracts 位于 `packages/shared`。
- 文件读取、Patch、Shell、Approval、Hooks、Trace、Eval、Subagents 已有教学级最小实现。
- 工程化文档已总结从教学 Lab 到产品可用版本的差距。

## 目录结构

```text
apps/
  web/                  React + Vite Web UI
  server/               Fastify API、SSE、session、依赖组装

packages/
  agent-core/           Agent Loop
  model-provider/       mock 与 OpenAI-compatible provider
  tool-system/          结构化工具注册、schema 校验、工具执行协议
  workspace/            文件树、读文件、搜索、workspace 边界
  patch-engine/         Diff Preview、Patch Proposal、apply
  permission/           Guardrails、Approval policy
  shell-runner/         命令分类、执行、超时和输出捕获
  self-repair/          测试失败后的修复 proposal
  lsp-client/           TypeScript diagnostics
  context-engine/       Repo map、相关文件选择、context budget
  planner/              Todo 状态机
  skills/               本地 SKILL.md 加载与选择
  hooks/                before/after 拦截与记录
  telemetry/            Session log、Trace、Replay 数据
  eval/                 任务评测
  subagents/            planner/coder/reviewer 角色隔离
  shared/               跨层 DTO 和事件类型

docs/
  milestones/           每阶段边界
  design/               每阶段设计说明
  tutorial/             中文教程章节
  blog/                 中文博客草稿
  engineering/          Phase 19 工程化审计与路线文档
```

## 快速开始

```bash
npm install
npm run typecheck
npm run build
PORT=8787 MODEL_PROVIDER=mock npm start
```

打开 `http://localhost:8787` 使用 Web UI。

接入真实 DeepSeek / OpenAI-compatible provider 时，在 `.env` 中设置：

```text
MODEL_PROVIDER=openai_compatible
deepseek_KEY=sk-...
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-chat
```

## 常用命令

```bash
npm run typecheck
npm run build
npm run eval
npm --workspace @wac/server run build
```

## 运行时数据

`data/` 和 `workspaces/` 是本地运行时目录，已被 `.gitignore` 忽略：

- `data/session-log.json`：当前 JSON SessionStore。
- `data/*.db*`：历史 SQLite 原型或本地实验文件，不属于当前提交产物。
- `workspaces/`：本地临时 workspace。

## 工程化路线

Phase 19 文档重点说明：

- 无用目录与历史原型包清理。
- 长短期记忆、工具管理、上下文管理、skill 加载的完成情况和改进方向。
- 离用户真正可用的小型项目开发体验还差什么。
- 给下一个会话接手的项目进度和交接摘要。

入口文档：

- `docs/engineering/repository-audit.md`
- `docs/engineering/runtime-capability-review.md`
- `docs/engineering/product-readiness-gap.md`
- `docs/HANDOFF.md`
