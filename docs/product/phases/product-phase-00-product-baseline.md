# Product Phase 00: Product Baseline

## Product Goal

把已完成的教学 Lab 切换到产品化开发基线：冻结新的产品化规则、路线、架构边界、文档格式和 P1 入口，让后续阶段可以按产品能力而不是教学章节推进。

## User Value

- 用户和后续开发会话能清楚知道：ByteSibyl 现在从教学 Lab 进入产品化路线。
- 后续每个产品化阶段仍有教程和博客，但内容转为产品实施、风险边界、验证和发布。
- P1 可以直接按产品 phase 文件开工，不再和旧的 Phase 0-19 规则冲突。

## Allowed Scope

- 更新治理规则：`AGENTS.md`、`skills/web-ai-coding-agent/SKILL.md`。
- 更新产品路线：`ROADMAP.md`、`docs/PRODUCTIZATION_DEVELOPMENT_PLAN.md`。
- 更新产品定位和架构：`docs/PRODUCT_SPEC.md`、`docs/ARCHITECTURE.md`。
- 更新教程/博客计划和提示词模板。
- 新增产品阶段目录和模板。
- 新增 P1 phase 文件，作为下一阶段入口。
- 撰写 P0 设计文档、中文教程和中文博客。

## Forbidden Scope

- 不实现 P1 的 Project Workspace / Git Worktree 功能。
- 不实现 Sandbox Runner。
- 不实现 Durable State Store。
- 不修改 Agent Loop 行为。
- 不新增生产依赖。
- 不修改既有示例项目脏改动。

## Required Artifacts

- `docs/product/phases/product-phase-00-product-baseline.md`
- `docs/design/product-phase-00-product-baseline.md`
- `docs/tutorial/product-phase-00-product-baseline.md`
- `docs/blog/product-phase-00-product-baseline.md`
- `docs/product/templates/product-phase-template.md`
- `docs/product/phases/README.md`
- `docs/product/phases/product-phase-01-project-workspace-git-isolation.md`

## Architecture Impact

### Memory

本阶段不实现新的 memory runtime。规则中明确产品化 memory 必须分层：conversation、run、workspace、project、user preference。

### Tool Governance

本阶段不修改工具执行。规则中明确后续产品阶段必须记录工具 schema、permission、source、version、risk 和 audit。

### Context Lifecycle

本阶段不修改 Context Engine。规则中明确 context 仍由系统控制，不能让模型 unrestricted ingestion。

### Skills / Plugins / MCP

本阶段不修改 skill loader。规则中明确远程 plugin / MCP 之前必须先有 manifest、权限和审计。

### Security and Sandbox

本阶段不实现 sandbox。规则中明确 P4 之前的 shell sandbox 仍是待实现产品化能力。

## Web UI Requirements

P0 是治理和产品基线阶段，不要求新增运行时 UI。若已有 Phase 19 UI 文案仍保留，后续 P1 再新增 Project / Workspace 状态区。

## Acceptance Criteria

1. `AGENTS.md` 区分 Tutorial Lab track 和 Productization track。
2. `skills/web-ai-coding-agent/SKILL.md` 支持产品化阶段工作流。
3. `ROADMAP.md` 追加 P0-P12 产品化路线。
4. `docs/PRODUCT_SPEC.md` 描述单用户 MVP、私有 Beta、团队产品。
5. `docs/ARCHITECTURE.md` 描述 Project Workspace、Sandbox、Durable State、Memory、Audit、Plugin/MCP 边界。
6. `docs/BLOG_PLAN.md` 明确产品化阶段仍必须写中文教程和中文博客。
7. `docs/PHASE-PROMPT-TEMPLATE.md` 提供产品化阶段提示词模板。
8. P1 phase 文件存在，后续可直接开工。
9. 验证命令通过。

## Validation Commands

```bash
npm run typecheck
npm run build
```

## Smoke Tests

P0 不新增 API。验证重点是文档和治理文件一致性：

```bash
rg -n "Productization|product-phase|产品化" AGENTS.md ROADMAP.md docs skills/web-ai-coding-agent/SKILL.md
```

## Migration and Rollback

- 无数据迁移。
- 回滚 P0 只影响治理文档和产品化计划，不影响 runtime 数据。

## Documentation Requirements

- Design doc: `docs/design/product-phase-00-product-baseline.md`
- Tutorial chapter: `docs/tutorial/product-phase-00-product-baseline.md`
- Blog draft: `docs/blog/product-phase-00-product-baseline.md`

## Remaining Risks

- P0 只建立规则，不提升真实产品能力。
- P1 仍需实际实现 project/worktree 隔离。
- P4 之前 shell 执行仍不是强 sandbox。
