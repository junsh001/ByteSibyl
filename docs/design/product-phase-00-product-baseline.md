# Product Phase 00 设计说明：Product Baseline

## 背景

Phase 0 到 Phase 19 已完成教学 Lab。接下来如果继续沿用旧规则，会出现两个问题：

1. 旧 phase 规则围绕“教程章节”组织，而产品化需要围绕用户能力、风险边界、迁移和发布组织。
2. 用户要求产品化阶段仍然产出教程和博客，但格式要改成产品化形式。

P0 的设计目标是建立新的开发基线，不改变 runtime 行为。

## 设计决策

### 双轨治理

`AGENTS.md` 和 `skills/web-ai-coding-agent/SKILL.md` 被改成双轨：

- Tutorial Lab track：Phase 0-19，已完成，作为历史教学路线保留。
- Productization track：P0 onward，按产品 capability 推进。

这样可以避免后续 P1 开发时继续被旧的“教学 milestone”语义误导。

### 产品 phase 文件

产品阶段要求放在：

```text
docs/product/phases/product-phase-xx-*.md
```

它比旧 `docs/milestones/` 多了这些栏目：

- User Value。
- Architecture Impact。
- Memory。
- Tool Governance。
- Context Lifecycle。
- Skills / Plugins / MCP。
- Security and Sandbox。
- Web UI Requirements。
- Migration and Rollback。

这些栏目保证每个产品阶段都主动思考风险边界。

### 教程和博客仍强制产出

产品化阶段仍必须写：

```text
docs/tutorial/product-phase-xx-*.md
docs/blog/product-phase-xx-*.md
```

但内容格式改变：

- 教程：产品能力实施教程，讲如何安全实现、验证、迁移、回滚。
- 博客：产品工程文章，讲用户价值、风险、架构取舍、发布策略、限制。

### 架构边界升级

`docs/ARCHITECTURE.md` 增加产品化层：

```text
Web Product Surface
  -> Server API / SSE
  -> Agent Runtime
  -> Project Workspace / Git Isolation
  -> Sandbox Execution
  -> Durable State / Memory / Audit
```

P0 只声明边界，不创建这些 runtime 包。

## 不改 runtime 的原因

P0 是产品化基线，不是 P1。提前实现 workspace/git/sandbox 会造成范围混乱。

因此本阶段不改：

- Agent Loop。
- Tool Runner。
- Patch Engine。
- Shell Runner。
- SessionStore runtime。

## Web 变化

P0 不新增运行时界面。产品化路线中的第一个明显 Web UI 变化会在 P1：Project / Workspace 状态区。

## 验证

P0 使用现有验证：

```bash
npm run typecheck
npm run build
```

因为本阶段不改 runtime，验证目标是确认治理文件和新增文档没有破坏现有构建。

## 后续阶段

P1 应从 `docs/product/phases/product-phase-01-project-workspace-git-isolation.md` 开始，实现 Project 和 Task Workspace。
