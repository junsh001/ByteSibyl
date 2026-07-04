# Web AI Coding Agent Lab Roadmap

This roadmap converts ByteSibyl into a teaching-oriented Web AI Coding Agent
Lab. The work is intentionally staged so each phase can be explained, tested,
and published as a tutorial chapter and blog draft.

## Phase Order

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

## Priority Lanes

### Minimum Usable Agent

Complete Phases 0, 1, 2, 3, 4, 6, 7, 8, and 9. This creates the first complete
Web coding-agent loop: inspect, validate, propose patch, approve, apply, and
verify.

### Model-backed Agent

Complete Phase 10 after the safe local loop exists. This replaces the mock model
with real provider adapters while keeping tool schemas, permissions, patch
approval, and shell guardrails as deterministic boundaries.

### Stability and Observability

Complete Phases 5, 11, 12, 13, 16, and 17. This turns the demo loop into a
stateful and measurable agent system.

### Extension

Complete Phases 14, 15, 18, and 19 after the single-agent loop is stable.

## Package Direction

The target architecture separates existing agent behavior into focused packages:

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
- `packages/shared`: dependency-free cross-layer contracts.

Existing packages may be migrated gradually. Do not rename or split them before
the phase that requires the boundary.
