# Web AI Coding Agent Skills 包

这个 skills 包用于辅助你从 0 到 1 开发一个教学型 Web AI Coding Agent。

项目目标不是完整复刻 Claude Code、Codex、OpenCode，而是把现代 coding agent 的核心思想拆开实现：agent loop、工具系统、上下文工程、patch 编辑、权限控制、验证闭环、trace、eval，并通过 Web AI Coding 的形式展示出来。

## 包含的 Skill

| Skill | 作用 |
|---|---|
| `phase-implementer` | 按阶段完成代码、设计文档、教程章节、博客草稿。 |
| `tutorial-writer` | 把阶段成果整理成教程和博客。 |
| `web-agent-architect` | 约束 Web IDE 层、Agent Runtime 层、Workspace Execution 层的边界。 |
| `code-reviewer` | 审查阶段范围、架构边界、安全规则、验证结果、文档一致性。 |
| `validation-fixer` | 专门修复 typecheck/build/test 失败，避免扩大修改范围。 |

## 推荐放置位置

把 `.skills/` 目录复制到项目根目录：

```text
web-ai-coding-agent/
├── AGENTS.md
├── ROADMAP.md
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── BLOG_PLAN.md
│   └── milestones/
├── .skills/
│   ├── phase-implementer/
│   ├── tutorial-writer/
│   ├── web-agent-architect/
│   ├── code-reviewer/
│   └── validation-fixer/
└── package.json
```

## 推荐使用流程

1. 先创建项目治理文件：`AGENTS.md`、`ROADMAP.md`、`docs/PRODUCT_SPEC.md`、`docs/ARCHITECTURE.md`、阶段任务文件。
2. 每次只用 `phase-implementer` 完成一个阶段。
3. 涉及目录结构或模块边界时，使用 `web-agent-architect`。
4. 验证失败时，使用 `validation-fixer`。
5. 阶段结束前，使用 `code-reviewer` 自查。
6. 阶段实现完成后，使用 `tutorial-writer` 修订教程和博客。

## 示例提示词

```text
Use the phase-implementer skill.

Task:
Complete Phase 1 according to docs/milestones/phase-01-web-server-shell.md.

Before editing, read:
1. AGENTS.md
2. ROADMAP.md
3. docs/PRODUCT_SPEC.md
4. docs/ARCHITECTURE.md
5. docs/milestones/phase-01-web-server-shell.md

只实现 Phase 1 允许范围。
不要提前实现后续阶段。
运行 phase 文件里的验证命令。
最终报告前使用 code-reviewer 自查。
```
