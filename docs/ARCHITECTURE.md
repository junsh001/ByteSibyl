# Architecture

## Layering

The system has three primary layers.

```text
Web UI
  - file tree
  - editor
  - agent chat
  - todo panel
  - logs and trace
  - diff approval

Server
  - HTTP API
  - SSE/WebSocket event stream
  - session lifecycle
  - workspace selection
  - approval routing

Agent Runtime Packages
  - agent core
  - model provider
  - tool system
  - workspace
  - patch engine
  - shell runner
  - permission
  - context engine
  - planner
  - lsp client
  - telemetry
```

## Dependency Rules

- Web UI depends on shared contracts and server APIs.
- Server depends on shared contracts and runtime packages.
- Agent core does not depend on Web UI.
- Tool system does not bypass permission policy once permission exists.
- Patch engine does not silently overwrite files.
- Shell runner does not execute unclassified commands.
- Shared package remains dependency-free.

## Target Repository Shape

```text
apps/
  web/                  Web IDE front end
  server/               API, event stream, sessions, workspace management
  cli/                  Optional debugging entry point

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
  shared/               Cross-layer DTOs and event schemas

docs/
  design/
  tutorial/
  blog/
  milestones/

examples/
  buggy-ts-project/
  mini-react-app/
  node-cli-bug-demo/
```

The current repository already contains working application code. Future phases
may migrate existing modules toward this target shape, but Phase 0 does not move
or rewrite code.

## Event Flow

```text
User submits task in Web
  -> Server creates or resumes session
  -> Agent core builds context and asks model provider
  -> Model emits structured tool request
  -> Tool system validates request
  -> Permission layer approves, blocks, or pauses
  -> Tool runner executes workspace, patch, shell, or diagnostic action
  -> Observation returns to agent core
  -> Server streams events to Web
  -> Web renders plan, logs, trace, and diff approvals
```

## Phase 0 Boundary

Phase 0 creates governance and documentation only. It does not implement or
change runtime behavior.

