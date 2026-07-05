# Web AI Coding Agent Lab 产品化开发计划

## 0. 计划定位

`web-ai-coding-agent-tutorial-plan.md` 已完成 Phase 0 到 Phase 19，目标是教学：把 Coding Agent 的核心机制拆开实现、解释和验证。

本计划从这里继续，目标改为产品化：让用户能在 Web 中导入一个真实小型项目，通过 AI 对话完成修改、运行验证、查看 Diff、审批变更，并在可控隔离环境中稳定工作。

本计划不再按“教程章节”组织，而按产品可用性组织。每个阶段都必须回答：

1. 用户能多做什么？
2. 风险边界是否更清楚？
3. 是否能被验证、回滚和审计？
4. 是否减少了从 demo 到真实使用的差距？

## 1. 产品目标

### 1.1 第一版产品目标

构建一个单用户优先的 Web AI Coding Agent：

```text
用户导入或选择项目
  -> 系统创建隔离 workspace / git branch
  -> 用户用自然语言描述任务
  -> Agent 读取上下文、运行检查、生成多文件 Patch Proposal
  -> Web 展示 Diff、命令结果、Trace 和风险
  -> 用户审批应用
  -> Agent 再次运行验证
  -> 用户可以下载变更、生成 commit 或 PR
```

### 1.2 非目标

第一版不追求：

- 完整 VS Code 替代。
- 无人值守长时间自主开发。
- 自动合并 PR。
- 大规模并行多 Agent。
- 公网多租户 SaaS 直接开放。
- MCP marketplace。

这些能力必须等基础隔离、持久化、审计和成本控制稳定后再做。

## 2. 产品化原则

1. **先隔离，再自动化**：没有 workspace/git/sandbox 隔离前，不扩大自动写入和自动执行能力。
2. **先单用户可用，再多用户**：先把本地/私有部署体验做稳定，再做账号、租户和配额。
3. **所有写入都可预览**：文件变更必须通过 Diff Preview 和审批。
4. **所有命令都可审计**：命令、退出码、stdout/stderr、工作目录、环境策略必须入 Trace。
5. **Memory 必须分层**：conversation、run、workspace、project、user preference 分开管理。
6. **模型只是一个 provider**：产品可靠性来自工具、状态、权限、验证和审计，不依赖模型自觉。
7. **Web 是主入口**：CLI 只用于调试、运维和 eval，不作为主要用户体验。

## 3. 路线总览

| 阶段 | 名称 | 目标用户价值 | 是否进入 MVP |
|---|---|---|---|
| P0 | Product Baseline | 清理教学残留，冻结产品边界 | 是 |
| P1 | Project Workspace & Git Isolation | 用户可以导入/选择项目并隔离修改 | 是 |
| P2 | Real Web IDE Editing | 用户可以真实编辑文件和查看多文件 Diff | 是 |
| P3 | Durable State Store | Session、任务、Trace、Patch 可恢复 | 是 |
| P4 | Sandbox Runner | 命令在隔离环境执行 | 是 |
| P5 | Product Agent Task Loop | 多轮任务、记忆摘要、恢复和验证闭环 | 是 |
| P6 | Multi-file Patch & Git Output | 多文件变更、commit/PR 草稿 | 是 |
| P7 | Model Routing & Cost Control | 真实模型可控、可降级、可计费 | Beta |
| P8 | UX Hardening | Web 工作台达到日常使用标准 | Beta |
| P9 | Security & Audit | 安全审计和策略版本化 | Beta |
| P10 | Team / Multi-user | 登录、租户、配额、项目权限 | SaaS |
| P11 | Plugin / MCP / Skill Ecosystem | 外部工具和工作流扩展 | SaaS+ |
| P12 | Continuous Evaluation | 回归评测和发布门禁 | 全程 |

## 4. MVP 定义

### 4.1 MVP 必须支持的用户故事

1. 用户选择一个本地 Git 项目。
2. 系统为任务创建独立 branch 或 worktree。
3. 用户输入：“修复 typecheck 错误”。
4. Agent 能读取文件、运行验证命令、定位错误。
5. Agent 生成多文件 Patch Proposal。
6. Web 展示 Diff、命令结果、Agent Todo、Trace。
7. 用户批准后应用 Patch。
8. Agent 再次运行验证命令。
9. 用户看到最终结果、剩余风险、变更文件列表。
10. 用户可以生成 commit 或导出 patch。

### 4.2 MVP 不承诺

- 自动发布。
- 自动合并 PR。
- 远程多人协作。
- 长时间后台无人值守。
- 任意不可信代码的公网运行。

## 5. 阶段计划

## P0：Product Baseline

目标：把教学项目转换为产品化开发基线。

主要任务：

- 保留 `web-ai-coding-agent-tutorial-plan.md` 作为历史教学计划。
- 新增产品化计划、产品需求、发布检查清单。
- 明确当前 demo 能力和产品化缺口。
- 清理无用依赖、旧文案、旧包残留。

验收标准：

- README 指向当前产品定位。
- 文档清楚区分 Lab 已实现能力和产品计划能力。
- `npm run typecheck`、`npm run build` 通过。

当前状态：Phase 19 已基本完成。

## P1：Project Workspace & Git Isolation

目标：让用户可以安全地导入/选择项目，并把每个任务隔离到独立 Git 工作区。

主要任务：

- 新增 Project 模型：id、name、repo path、default branch、createdAt。
- 新增 Workspace Session：每次 Agent 任务绑定一个 worktree/branch。
- 支持选择本地项目目录，或从 Git URL clone。
- 每个任务创建 branch，例如 `bytesibyl/task-<id>`。
- 禁止 Agent 直接修改原始 checkout。
- Web 展示 project、branch、workspace path、dirty files。

核心包：

- `packages/workspace`
- `packages/telemetry`
- `apps/server`
- `apps/web`

验收标准：

- 用户能创建 project。
- 每次 Agent Run 有独立 workspace。
- 原始仓库不被直接修改。
- 任务结束后可以查看 changed files。

风险：

- 本地路径权限。
- Git 命令失败处理。
- worktree 清理策略。

## P2：Real Web IDE Editing

目标：让 Web 编辑区从“展示/patch draft”变成真实可用编辑器。

主要任务：

- 接入 Monaco Editor。
- 文件打开、编辑、保存草稿。
- 大文件保护和只读模式。
- 多 tab 或最近打开文件。
- DiffEditor 展示 proposed vs current。
- 支持多文件 Patch Preview。
- 编辑器变更仍必须走 Patch Proposal，而不是静默写入。

验收标准：

- 用户能编辑文件草稿。
- 生成 Diff Preview 时能看到 Monaco Diff。
- 大文件不会卡死页面。
- 保存/应用路径经过 approval。

风险：

- Monaco bundle 体积。
- 编辑状态与 workspace 文件状态冲突。
- 多文件 proposal 的 UI 复杂度。

## P3：Durable State Store

目标：把 JSON SessionStore 升级为产品级持久层。

主要任务：

- 设计数据库 schema：projects、workspaces、sessions、runs、events、steps、patches、approvals、commands、model_calls、hooks、memories。
- 本地优先使用 SQLite，后续兼容 Postgres。
- 提供 migration。
- Session Log 支持分页。
- Trace Timeline 支持 lazy loading。
- 保留导出 JSON trace 的能力。

验收标准：

- 重启 Server 后 session、run、patch、approval、command 仍可查询。
- 大 session 不会一次性加载全部事件。
- Eval 能读取历史结果。

风险：

- 迁移现有 JSON 数据。
- SQLite 并发写入。
- schema 过早复杂化。

## P4：Sandbox Runner

目标：让 shell 命令进入真正隔离环境。

主要任务：

- 定义 SandboxProvider 接口。
- 本地实现 Docker sandbox。
- 配置 CPU、内存、磁盘、进程数、超时、网络策略。
- Secret 默认不注入 sandbox。
- 命令执行前后生成文件系统快照或 git diff。
- Web 展示 sandbox 状态、资源限制、命令审计。

验收标准：

- `npm test` / `npm run typecheck` 在 sandbox 内运行。
- 危险命令不能影响宿主机。
- 超时和资源限制生效。
- stdout/stderr 和 exit code 入 Trace。

风险：

- Docker 不可用时的降级策略。
- 文件挂载权限。
- Windows/macOS/Linux 差异。

## P5：Product Agent Task Loop

目标：把教学 Agent Loop 升级成可恢复的产品任务循环。

主要任务：

- 引入 Task 状态机：created、planning、running、waiting_approval、verifying、completed、failed、cancelled。
- 多轮对话记忆：conversation summary、task summary、latest decisions。
- Run resume：中断后从任务状态恢复。
- Stop reason 明确化：done、blocked、approval_required、budget_exceeded、sandbox_failed。
- Planner 输出可编辑步骤。
- Reviewer step 在 apply 前后检查风险。

验收标准：

- 刷新页面后任务状态不丢。
- 用户能继续上次任务。
- 需要 approval 时 Agent 停住而不是继续猜。
- 长任务有明确进度和取消能力。

风险：

- 状态机膨胀。
- 模型输出和系统状态不一致。
- Resume 后上下文重建质量。

## P6：Multi-file Patch & Git Output

目标：支持真实小型项目常见的多文件修改和 Git 输出。

主要任务：

- Patch Proposal 支持多个文件。
- 使用 git diff 或成熟 diff 库生成展示。
- 支持新增、修改、删除、重命名。
- 支持 conflict 检测。
- 支持局部接受/拒绝文件。
- 支持生成 commit message。
- 支持导出 patch 文件。
- 可选：创建 PR 草稿，不自动 merge。

验收标准：

- Agent 可以提出多文件 patch。
- 用户能逐文件查看和审批。
- Apply 后 git diff 与 UI 一致。
- 验证命令失败时能回到修复循环。

风险：

- patch apply 冲突。
- UI 承载复杂 diff。
- 二进制文件处理。

## P7：Model Routing & Cost Control

目标：让真实模型使用可控、可观测、可降级。

主要任务：

- Model Router：cheap、default、reasoning、reviewer。
- per-run token/cost budget。
- timeout、retry、fallback。
- provider health check。
- usage dashboard。
- 模型调用输入输出摘要入审计。
- 支持不同任务阶段选择不同模型。

验收标准：

- 用户能看到本次任务 token/cost。
- 超预算时任务停止并解释。
- provider 失败时可切换 mock/fallback。
- reviewer 不复用 coder 的全部上下文，避免污染。

风险：

- 成本估算不准。
- 不同 provider tool calling 差异。
- 日志中泄漏敏感 prompt。

## P8：UX Hardening

目标：让 Web 工作台达到日常使用最低标准。

主要任务：

- 文件树虚拟化和搜索优化。
- 日志分页、Trace filter。
- Diff 高亮、文件跳转、错误定位。
- 命令运行状态和取消按钮。
- Toast/notification。
- 空状态、错误状态、loading 状态统一。
- 键盘快捷键。
- 小屏布局。

验收标准：

- 1000+ 文件 workspace 仍可操作。
- 长日志不会卡死。
- 用户能从 diagnostic 跳到文件和 diff。
- 关键按钮不会因状态不明点不动。

风险：

- 前端状态复杂。
- 大量事件渲染性能。
- UI 和后端状态不同步。

## P9：Security & Audit

目标：系统性审计所有高风险行为。

主要任务：

- Policy manifest：命令、文件路径、网络、依赖安装、secret。
- Approval reason 必填。
- 审计日志不可随意修改。
- Secret redaction。
- 命令 allowlist/denylist 版本化。
- 高风险动作二次确认。
- 安全测试用例。

验收标准：

- 每个写文件、命令、approval、model call 都能追溯。
- 日志不显示 API key。
- 高风险命令被阻止或要求审批。

风险：

- 审计数据过多。
- redaction 漏洞。
- 策略太严影响可用性。

## P10：Team / Multi-user

目标：从单用户私有部署走向团队使用。

主要任务：

- Auth。
- User / Organization / Project 模型。
- Workspace ownership。
- Quota。
- 并发任务限制。
- Team audit log。
- 邀请和权限。

验收标准：

- 用户只能访问自己的项目。
- 每个租户有独立 workspace root。
- 配额超限时任务停止。

风险：

- 权限模型复杂。
- 数据隔离漏洞。
- 成本和资源滥用。

## P11：Plugin / MCP / Skill Ecosystem

目标：开放扩展，但不绕过安全边界。

主要任务：

- Plugin manifest。
- Skill manifest。
- MCP server registry。
- 工具权限声明。
- 安装/启用/禁用。
- 每个 plugin 的 audit。

验收标准：

- 外部 MCP tool 必须通过 schema、permission、audit。
- Skill 注入内容可追溯。
- 用户能禁用高风险扩展。

风险：

- 外部工具供应链风险。
- 权限声明不完整。
- Prompt injection。

## P12：Continuous Evaluation

目标：把 Eval 从手动按钮变成发布门禁。

主要任务：

- 扩展 eval tasks。
- 增加 regression suite。
- 每个 PR 跑核心 eval。
- 记录历史 pass rate。
- 按能力维度分组：workspace、patch、shell、memory、approval、context。
- 失败报告关联 trace。

验收标准：

- 关键能力退化能被发现。
- Eval 结果可对比。
- 失败任务可复现。

风险：

- Eval 太慢。
- 指标不能代表真实用户体验。
- 模型波动导致结果不稳定。

## 6. 推荐实施顺序

### Wave 1：单用户小项目可用

目标：让用户能稳定完成一个小型项目修改。

范围：

1. P1 Project Workspace & Git Isolation。
2. P2 Real Web IDE Editing。
3. P3 Durable State Store。
4. P4 Sandbox Runner。
5. P6 Multi-file Patch & Git Output 的最小版本。

完成后应该能说：

> 用户可以导入一个小型 TypeScript/Node 项目，让 Agent 修改代码、运行验证、审批 Diff，并导出变更。

### Wave 2：任务稳定与真实模型可控

范围：

1. P5 Product Agent Task Loop。
2. P7 Model Routing & Cost Control。
3. P8 UX Hardening。
4. P12 核心 Eval 门禁。

完成后应该能说：

> 用户可以连续多轮推进一个任务，系统能恢复、限额、重试、降级，并清楚展示进度和成本。

### Wave 3：私有部署 Beta

范围：

1. P9 Security & Audit。
2. Docker Compose / Helm / deployment docs。
3. 项目级配置和策略文件。
4. 数据备份和恢复。

完成后应该能说：

> 团队可以在可信内网部署，给真实仓库做受控 AI 编码实验。

### Wave 4：团队产品

范围：

1. P10 Team / Multi-user。
2. P11 Plugin / MCP / Skill Ecosystem。
3. 更完整的计费、配额、审计和扩展市场。

## 7. 新的开发节奏

教学阶段每个 phase 要求“代码 + 设计文档 + 教程 + 博客”。产品化阶段继续保留这个要求，但文档格式改成产品化口径：

每个 product phase 必须包含：

1. `docs/product/phases/product-phase-xx-*.md`：产品需求、范围、验收、迁移和验证命令。
2. `docs/design/product-phase-xx-*.md`：工程设计、包边界和状态流。
3. `docs/tutorial/product-phase-xx-*.md`：中文产品化实施教程，说明如何安全实现、验证和回滚。
4. `docs/blog/product-phase-xx-*.md`：中文产品工程博客，说明用户价值、风险边界、取舍和限制。
5. 代码实现。
6. Web UI 变化说明。
7. 测试、eval 或 smoke。
8. Memory、Tool Governance、Context Lifecycle、Skill/Plugin、Security 影响说明。
9. 迁移说明，如果涉及数据。

## 8. 分支和发布策略

建议：

- `main`：稳定主线。
- `product/base`：产品化基线。
- `product/p1-workspace-git`：P1 分支。
- `product/p2-web-ide-editing`：P2 分支。
- 每个 PR 必须包含验证结果和前端变化说明。

发布节奏：

- `v0.1-lab-complete`：教学 Lab 完成。
- `v0.2-single-user-mvp`：单用户小项目可用。
- `v0.3-private-beta`：私有部署 Beta。
- `v0.4-team-alpha`：团队多用户 Alpha。

## 9. 风险清单

最高优先级风险：

1. Workspace 隔离不足导致用户代码被污染。
2. Shell sandbox 不强导致宿主机风险。
3. SessionStore 不可扩展导致长任务不可恢复。
4. Patch apply 不可靠导致用户无法信任结果。
5. 模型成本不可控。
6. Web UI 在真实项目规模下卡顿。
7. Secret 泄漏到模型、日志或 sandbox。

每个产品化阶段都应该明确自己降低了哪个风险。

## 10. 下一步建议

立即开始 P1：Project Workspace & Git Isolation。

原因：

- 这是从教学 demo 到真实项目使用的第一道边界。
- 没有 Git/worktree 隔离，后续多文件 patch、sandbox、PR 都缺少可靠承载。
- P1 完成后，Web AI Coding Agent 才能从“操作示例目录”升级为“操作用户项目”。

P1 第一个 PR 建议只做：

1. Project/Workspace shared types。
2. Server project registry。
3. 创建 project API。
4. 基于 git worktree 创建 task workspace。
5. Web 展示 project/workspace/branch。
6. 不让 Agent 自动写入原始仓库。

验证命令：

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

可选 smoke：

```bash
POST /api/projects
POST /api/projects/:id/workspaces
GET /api/projects/:id/workspaces/:workspaceId
```
