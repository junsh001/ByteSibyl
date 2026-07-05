# Web AI Coding Agent Lab Roadmap

This roadmap now has two tracks:

1. **Tutorial Lab track**: completed Phase 0-19. It explains and implements the
   core mechanics of a Web AI Coding Agent.
2. **Productization track**: active P0 onward. It turns the completed Lab into a
   usable product.

## Tutorial Lab Track: Completed

| Phase | Name | Primary Outcome |
|---|---|---|
| 0 | Governance | Project rules, roadmap, architecture docs, tutorial/blog baseline |
| 1 | Web + Server Shell | Web IDE layout, server health check, session/event contracts |
| 2 | Workspace Filesystem | File tree, read file, search text, workspace path safety |
| 3 | Tool System | Tool registry, schema validation, standard tool results |
| 4 | Agent Loop | Model-provider abstraction, tool-observation loop, max iterations |
| 5 | Session State | Durable run state, pause/cancel, step log persistence |
| 6 | Patch Engine | Proposed diffs, preview, approved apply, patch history |
| 7 | Approval and Guardrails | Permission classes, approval interruption, forbidden actions |
| 8 | Shell Runner | Safe command execution, timeout, stdout/stderr capture |
| 9 | Self-Repair Loop | Typecheck failure to patch to verification loop |
| 10 | Model Provider Integration | Real model adapters, API key config, timeout/error handling, usage records |
| 11 | LSP Diagnostics | TypeScript diagnostics as Web and agent feedback |
| 12 | Context Engine | Repo map, relevant file selection, context budget control |
| 13 | Todo Planner | Explicit task plan and task-state transitions |
| 14 | Skills | Reusable workflow instructions loaded from skill files |
| 15 | Hooks | Deterministic before/after tool and edit interception |
| 16 | Trace and Replay | Timeline traces, session replay, exportable trace JSON |
| 17 | Evaluation | Eval task format, batch runner, objective metrics |
| 18 | Subagents | Planner/coder/reviewer roles with separated permissions |
| 19 | Engineering Route | Productization gaps: sandboxing, multi-user, plugins, deployment |

The detailed tutorial track remains in
`web-ai-coding-agent-tutorial-plan.md`.

## Productization Track: Active

The active productization plan is
`docs/PRODUCTIZATION_DEVELOPMENT_PLAN.md`.

| Product Phase | Name | Primary Outcome |
|---|---|---|
| P0 | Product Baseline | Freeze product boundaries and align governance |
| P1 | Project Workspace & Git Isolation | User projects run in isolated branch/worktree workspaces |
| P2 | Real Web IDE Editing | Monaco-based editing and product-grade diff viewing |
| P3 | Durable State Store | Sessions, runs, patches, commands, traces, and memories survive restart |
| P4 | Sandbox Runner | Commands execute in an isolated sandbox provider |
| P5 | Product Agent Task Loop | Durable task state, memory summaries, resume, and verification loop |
| P6 | Multi-file Patch & Git Output | Multi-file patch, conflict handling, commit/PR draft output |
| P7 | Model Routing & Cost Control | Router, fallback, retry, budget, usage dashboard |
| P8 | UX Hardening | File tree scale, log pagination, trace filtering, error states |
| P9 | Security & Audit | Policy manifests, secret redaction, immutable audit trail |
| P10 | Team / Multi-user | Auth, tenants, quota, project permissions |
| P11 | Plugin / MCP / Skill Ecosystem | Manifest-driven plugins, MCP tools, skill governance |
| P12 | Continuous Evaluation | Regression evals and release gates |

## Productization Waves

### Wave 1: Single-user MVP

Complete P1, P2, P3, P4, and a minimal P6.

User value: a user can import a small Git project, ask the agent to change it,
review a multi-file diff, approve it, and export a commit or patch without
polluting the original checkout.

### Wave 2: Stable Real-model Tasks

Complete P5, P7, P8, and core P12 eval gates.

User value: a user can continue multi-turn tasks, resume after interruptions,
see model cost, and rely on stable Web UI feedback.

### Wave 3: Private Beta

Complete P9 plus deployment hardening.

User value: a trusted team can deploy the system in a private environment with
auditable file, command, model, and approval records.

### Wave 4: Team Product

Complete P10 and P11.

User value: multiple users can share projects, control permissions, and extend
the agent through governed plugins, skills, and MCP tools.

## Package Direction

The current Lab packages remain the starting point:

- `packages/agent-core`: loop, run state, step executor.
- `packages/model-provider`: model abstraction and provider adapters.
- `packages/tool-system`: tool registry, schema validation, result contracts.
- `packages/workspace`: file tree, read file, search, repo map input.
- `packages/patch-engine`: diff, patch proposal, apply, rollback note.
- `packages/shell-runner`: command classification, execution, timeout, output.
- `packages/context-engine`: context construction and budget control.
- `packages/planner`: todo state machine.
- `packages/lsp-client`: diagnostics.
- `packages/permission`: guardrails, approval policy.
- `packages/telemetry`: trace, logs, replay, eval records.
- `packages/skills`: local skill loading and selection.
- `packages/hooks`: deterministic lifecycle interception.
- `packages/subagents`: role definitions and subagent summaries.
- `packages/shared`: dependency-free cross-layer contracts.

Productization may add or extend packages for:

- `packages/project-store`: project registry and workspace metadata.
- `packages/git-workspace`: clone, branch, worktree, changed-file status.
- `packages/sandbox-runner`: Docker or other sandbox providers.
- `packages/memory`: memory summaries, retrieval, and persistence contracts.
- `packages/audit`: policy-aware audit trail and redaction helpers.
- `packages/plugin-system`: plugin, MCP, and skill manifest governance.

Do not introduce these packages before their product phase requires them.
