---
name: web-agent-architect
description: Use this skill when designing or modifying the architecture, module boundaries, or directory structure of the Web AI Coding Agent project.
---

# Web Agent Architect Skill

## Purpose

Keep the project architecture clean and teachable.

This project has three primary layers:

1. Web IDE Layer.
2. Agent Runtime Layer.
3. Workspace Execution Layer.

The main risk is mixing UI logic, agent reasoning, and workspace execution into one module. This skill prevents that.

## Layer Model

```text
Web IDE Layer
  ↓ API / WebSocket / SSE contracts
Agent Runtime Layer
  ↓ structured tool calls
Workspace Execution Layer
```

## Web IDE Layer

Allowed responsibilities:

- File tree display.
- Monaco editor view.
- Agent chat panel.
- Task plan panel.
- Diff preview.
- Terminal or log panel.
- Trace timeline display.
- User approval interactions.

Forbidden responsibilities:

- Agent reasoning logic.
- Tool selection logic.
- Patch application logic.
- Shell execution logic.
- Permission decision logic.
- Context compression logic.

## Agent Runtime Layer

Allowed responsibilities:

- Agent loop.
- State machine.
- Planner / todo state.
- Tool-call protocol.
- Observation handling.
- Context assembly.
- Stop conditions.
- Guardrail decisions.
- Trace event emission.

Forbidden responsibilities:

- Direct DOM access.
- Frontend framework code.
- Raw filesystem mutation.
- Raw shell execution.
- UI rendering.

## Workspace Execution Layer

Allowed responsibilities:

- List files.
- Read files.
- Search code.
- Create diff.
- Apply patch.
- Run shell commands.
- Get LSP diagnostics.
- Get git diff.
- Enforce workspace path boundaries.

Forbidden responsibilities:

- Model reasoning.
- Task planning.
- UI rendering.
- Chat response composition.

## Package Boundary Rules

Recommended package ownership:

- `apps/web`: UI only.
- `apps/server`: API, sessions, event streaming, dependency wiring.
- `packages/shared`: shared contracts and DTOs.
- `packages/agent-core`: agent loop and state transitions.
- `packages/tool-system`: tool registry, schema validation, tool execution protocol.
- `packages/workspace`: file tree, file read, search, workspace boundaries.
- `packages/patch-engine`: diff, patch proposal, patch application.
- `packages/shell-runner`: command execution, timeout, command log.
- `packages/permission`: command and edit approval policy.
- `packages/context-engine`: repo map, context selection, compaction.
- `packages/planner`: todo and task state.
- `packages/lsp-client`: diagnostics.
- `packages/telemetry`: trace and replay data.

## Import Rules

- `agent-core` must not import from `apps/web`.
- `agent-core` should call workspace functions through tools, not through UI code.
- `apps/web` should import only shared types, generated API clients, and UI utilities.
- `packages/shared` must not depend on app packages.
- `workspace`, `patch-engine`, and `shell-runner` must not call the model provider directly.
- Permission checks must be explicit, not hidden in UI code.

## Architecture Review Checklist

Before approving an architectural change, check:

1. Is the responsibility in the correct layer?
2. Does the change introduce a circular dependency?
3. Does it make the Web UI too smart?
4. Does it bypass permission policy?
5. Does it introduce future-phase complexity too early?
6. Is the boundary explainable in the tutorial?
7. Are shared contracts placed in `packages/shared`?

## Output Format

Return:

1. Proposed architecture decision.
2. Affected packages.
3. Allowed dependencies.
4. Rejected alternatives.
5. Risks.
6. Documentation updates required.
