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
| 10 | LSP Diagnostics | TypeScript diagnostics as Web and agent feedback |
| 11 | Context Engine | Repo map, relevant file selection, context budget control |
| 12 | Todo Planner | Explicit task plan and task-state transitions |
| 13 | Skills | Reusable workflow instructions loaded from skill files |
| 14 | Hooks | Deterministic before/after tool and edit interception |
| 15 | Trace and Replay | Timeline traces, session replay, exportable trace JSON |
| 16 | Evaluation | Eval task format, batch runner, objective metrics |
| 17 | Subagents | Planner/coder/reviewer roles with separated permissions |
| 18 | Engineering Route | Productization gaps: sandboxing, multi-user, plugins, deployment |

## Priority Lanes

### Minimum Usable Agent

Complete Phases 0, 1, 2, 3, 4, 6, 7, 8, and 9. This creates the first complete
Web coding-agent loop: inspect, validate, propose patch, approve, apply, and
verify.

### Stability and Observability

Complete Phases 5, 10, 11, 12, 15, and 16. This turns the demo loop into a
stateful and measurable agent system.

### Extension

Complete Phases 13, 14, 17, and 18 after the single-agent loop is stable.

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

