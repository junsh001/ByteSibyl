# Architecture

## Architecture Tracks

The completed Tutorial Lab used a three-layer architecture:

```text
Web UI
  -> Server
  -> Agent Runtime Packages
```

The productization track keeps that foundation but adds product boundaries:

```text
Web Product Surface
  -> Server API / SSE
  -> Agent Runtime
  -> Project Workspace / Git Isolation
  -> Sandbox Execution
  -> Durable State / Memory / Audit
```

## Product Layers

### Web Product Surface

Responsibilities:

- Project and workspace selection.
- File tree and editor.
- Agent Chat and task state.
- Todo plan and task progress.
- Diff Preview and approval.
- Terminal / command log.
- Trace and audit views.
- Memory, tool, skill, and sandbox status surfaces as they become available.

Forbidden responsibilities:

- Agent reasoning.
- Tool selection.
- Patch application.
- Shell execution.
- Permission decisions.
- Context compression.
- Secret handling.

### Server Layer

Responsibilities:

- HTTP API and SSE event stream.
- Session and task lifecycle.
- Dependency assembly.
- Project/workspace registry.
- Approval routing.
- Model provider configuration.
- Sandbox provider orchestration.
- Durable store access.

Forbidden responsibilities:

- UI rendering logic.
- Directly bypassing runtime package boundaries.
- Running unclassified commands.
- Applying patches without approval.

### Agent Runtime Layer

Responsibilities:

- Agent Loop.
- Task state machine.
- Planner and todo transitions.
- Subagent summaries and role boundaries.
- Tool call protocol.
- Observation handling.
- Context construction.
- Memory summaries.
- Stop reasons.
- Trace events.

Forbidden responsibilities:

- Direct DOM access.
- Direct shell execution.
- Direct file writes outside patch/workspace abstractions.
- Secret exposure.

### Workspace and Git Layer

Responsibilities:

- Project import / selection.
- Branch and worktree creation.
- Workspace path boundaries.
- Changed-file status.
- Git diff and patch output.
- Cleanup and rollback notes.

Product rule:

After P1, Agent tasks must operate on isolated task workspaces, not the user's
original checkout.

### Sandbox Execution Layer

Responsibilities:

- Command classification.
- Sandboxed command execution.
- Timeout, output limits, CPU/memory/disk limits.
- Network policy.
- Secret isolation.
- Captured stdout/stderr/exit code.

Product rule:

After P4, product validation commands should execute through a SandboxProvider.
Local process execution may remain as a documented fallback only.

### Durable State, Memory, and Audit Layer

Responsibilities:

- Projects.
- Workspaces.
- Sessions.
- Tasks and runs.
- Events and steps.
- Patch proposals.
- Approvals.
- Commands.
- Model calls.
- Hooks.
- Memory records.
- Audit records.

Memory is layered:

- Conversation memory.
- Run memory.
- Workspace memory.
- Project memory.
- User preference memory.

Audit records must make high-risk actions explainable and reviewable.

## Dependency Rules

- Web UI depends on shared contracts and server APIs.
- Server depends on shared contracts and runtime packages.
- Agent core does not depend on Web UI.
- Tool system does not bypass permission policy.
- Patch engine does not silently overwrite files.
- Shell runner does not execute unclassified commands.
- Sandbox provider does not receive secrets by default.
- Context engine does not ingest arbitrary files without system policy.
- Memory retrieval must respect project, user, and workspace boundaries.
- Plugin/MCP tools must go through tool governance, permission, and audit.
- Shared package remains dependency-free.

## Current Repository Shape

```text
apps/
  web/                  Web IDE front end
  server/               API, event stream, sessions, dependency assembly

packages/
  agent-core/           Agent loop, run state, step executor
  model-provider/       Model abstraction and adapters
  tool-system/          Tool schemas, registry, runner
  workspace/            Filesystem tools, search, repo map inputs
  patch-engine/         Diff, patch proposal, apply, rollback notes
  shell-runner/         Command policy, execution, timeout, captured output
  context-engine/       Context construction, compression, budget control
  planner/              Todo state machine
  lsp-client/           Language server diagnostics
  permission/           Guardrails, approval, policy
  telemetry/            Trace, logs, replay, eval records
  skills/               Local skill loading and selection
  hooks/                Deterministic lifecycle interception
  subagents/            Planner/coder/reviewer role summaries
  eval/                 Eval task runner and metrics
  shared/               Cross-layer DTOs and event schemas

docs/
  design/
  tutorial/
  blog/
  milestones/
  product/
  engineering/
```

## Productization Target Packages

Introduce only when a product phase needs them:

- `packages/project-store`: project and workspace metadata.
- `packages/git-workspace`: clone, branch, worktree, diff, changed-file status.
- `packages/sandbox-runner`: Docker or other sandbox providers.
- `packages/memory`: memory records, summaries, retrieval boundaries.
- `packages/audit`: policy-aware audit records and redaction.
- `packages/plugin-system`: plugin, MCP, and skill manifest governance.

## Product Event Flow

```text
User submits task in Web
  -> Server creates or resumes Product Task
  -> Git layer creates isolated task workspace
  -> Agent core builds context and memory summary
  -> Model provider returns structured tool request
  -> Tool system validates request
  -> Permission layer approves, blocks, or pauses
  -> Workspace / patch / sandbox runner executes action
  -> Observation returns to agent core
  -> Durable store records events, memory, commands, model calls, audit
  -> Server streams events to Web
  -> Web renders progress, diff, trace, approval, and risks
```

## Documentation Architecture

Tutorial Lab phases:

- `docs/milestones/phase-xx-*.md`
- `docs/design/phase-xx-*.md`
- `docs/tutorial/chapter-xx-*.md`
- `docs/blog/xx-*.md`

Productization phases:

- `docs/product/phases/product-phase-xx-*.md`
- `docs/design/product-phase-xx-*.md`
- `docs/tutorial/product-phase-xx-*.md`
- `docs/blog/product-phase-xx-*.md`

Productization tutorials and blogs remain mandatory, but their content is
product-oriented: rollout, safety, UX, validation, migration, and limitations.
