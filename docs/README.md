# Web AI Coding Agent Skills Pack

This skills pack is designed for a teaching-oriented Web AI Coding Agent project.

The project goal is to implement the core ideas of modern coding agents—agent loop, tools, context engineering, patch editing, permissions, validation, tracing, and evaluation—while presenting the work through a Web AI Coding interface.

## Included Skills

| Skill | Purpose |
|---|---|
| `phase-implementer` | Implements one milestone phase with matching code, design docs, tutorial chapter, and blog draft. |
| `tutorial-writer` | Turns phase outcomes into educational tutorial and blog content. |
| `web-agent-architect` | Keeps the Web IDE layer, Agent Runtime layer, and Workspace Execution layer separated. |
| `code-reviewer` | Reviews scope, architecture, safety, validation, and documentation consistency. |
| `validation-fixer` | Fixes typecheck/build/test failures without expanding scope. |

## Recommended Repository Layout

Copy the `.skills/` directory into your project root:

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

## Recommended Workflow

1. Create project governance files first: `AGENTS.md`, `ROADMAP.md`, `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, and phase milestone files.
2. Use `phase-implementer` for one phase at a time.
3. Use `web-agent-architect` when changing module boundaries or directory structure.
4. Use `validation-fixer` when typecheck/build/test fails.
5. Use `code-reviewer` before finalizing each phase.
6. Use `tutorial-writer` after implementation to polish the tutorial and blog drafts.

## Prompt Example

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

Implement only the allowed scope of Phase 1.
Do not implement future phases.
Run the validation command from the phase file.
Use code-reviewer before the final report.
```
