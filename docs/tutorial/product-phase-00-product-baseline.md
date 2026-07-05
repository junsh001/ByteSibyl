# Product Phase 00：建立产品化开发基线

## 学习目标

本章把已经完成的 Web AI Coding Agent Lab 切换到产品化开发模式。

完成后你会得到：

1. 双轨治理规则。
2. 产品化阶段路线。
3. 产品 phase 文件模板。
4. P1 的产品需求入口。
5. 产品化教程和博客的新格式。

## 为什么需要 P0

教学阶段的目标是解释每个 Agent 机制。产品化阶段的目标不同：让用户能安全地把真实项目交给 Agent。

这意味着后续每个阶段都要额外回答：

- 用户价值是什么？
- 是否改变 Memory？
- 是否改变 Tool Governance？
- 是否改变 Context Lifecycle？
- 是否影响 Skill / Plugin / MCP？
- 是否增加安全风险？
- Web UI 发生了什么变化？
- 如何验证、迁移和回滚？

P0 就是把这些问题固化到规则文件中。

## 第一步：更新治理规则

修改 `AGENTS.md`：

- 保留 Tutorial Lab track。
- 增加 Productization track。
- 明确产品化阶段仍要写中文教程和中文博客。
- 明确最终报告必须包含前端界面变化。

修改 `skills/web-ai-coding-agent/SKILL.md`：

- 教学阶段读取 `web-ai-coding-agent-tutorial-plan.md`。
- 产品化阶段读取 `docs/PRODUCTIZATION_DEVELOPMENT_PLAN.md`。
- 产品化阶段读取 `docs/product/phases/product-phase-xx-*.md`。

## 第二步：更新产品路线

修改 `ROADMAP.md`，把路线分成：

```text
Tutorial Lab Track: Phase 0-19
Productization Track: P0-P12
```

P0-P12 的核心顺序是：

```text
Product Baseline
Project Workspace & Git Isolation
Real Web IDE Editing
Durable State Store
Sandbox Runner
Product Agent Task Loop
Multi-file Patch & Git Output
Model Routing & Cost Control
UX Hardening
Security & Audit
Team / Multi-user
Plugin / MCP / Skill Ecosystem
Continuous Evaluation
```

## 第三步：更新产品规格和架构

`docs/PRODUCT_SPEC.md` 需要从“教学 Lab”升级为产品目标：

- 单用户 MVP。
- 私有 Beta。
- 团队产品。

`docs/ARCHITECTURE.md` 需要新增产品层：

- Project Workspace / Git Isolation。
- Sandbox Execution。
- Durable State / Memory / Audit。
- Plugin / MCP Governance。

## 第四步：建立产品 phase 模板

新增：

```text
docs/product/templates/product-phase-template.md
```

这个模板要求每个产品阶段写清楚：

- Memory。
- Tool Governance。
- Context Lifecycle。
- Skills / Plugins / MCP。
- Security and Sandbox。
- Web UI Requirements。
- Migration and Rollback。

## 第五步：准备 P1

新增：

```text
docs/product/phases/product-phase-01-project-workspace-git-isolation.md
```

P1 的目标是让用户真实项目进入隔离 workspace，而不是继续直接操作示例目录。

## 运行验证

P0 不修改 runtime 行为，但仍要确认项目能构建：

```bash
npm run typecheck
npm run build
```

也可以检查产品化规则是否已经写入：

```bash
rg -n "Productization|product-phase|产品化" AGENTS.md ROADMAP.md docs skills/web-ai-coding-agent/SKILL.md
```

## 当前限制

P0 只是产品化准备：

- 没有实现 Git worktree。
- 没有实现 Docker sandbox。
- 没有迁移数据库。
- 没有改变 Agent Loop。

这些都留给后续产品阶段。

## 下一章

P1 会实现 Project Workspace & Git Isolation，让 Agent 的工作目录从示例项目升级为真实 Git 项目的隔离 worktree。
