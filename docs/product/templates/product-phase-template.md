# Product Phase Template

## Phase

P<N>: <Name>

## Product Goal

Describe the user-visible product capability this phase delivers.

## User Value

- What can the user do after this phase?
- Which product risk is reduced?

## Allowed Scope

- Runtime changes allowed in this phase.
- Web UI changes allowed in this phase.
- Documentation changes required in this phase.

## Forbidden Scope

- Future product capabilities that must not be implemented yet.
- Risky shortcuts that are not allowed.

## Required Artifacts

- `docs/product/phases/product-phase-<NN>-<slug>.md`
- `docs/design/product-phase-<NN>-<slug>.md`
- `docs/tutorial/product-phase-<NN>-<slug>.md`
- `docs/blog/product-phase-<NN>-<slug>.md`
- Runtime code.
- Web UI changes.
- Tests, eval tasks, or smoke checks.

## Architecture Impact

### Memory

State whether this phase changes conversation, run, workspace, project, or user
preference memory.

### Tool Governance

State whether this phase changes tool schema, permission, source, version,
risk, or audit behavior.

### Context Lifecycle

State whether this phase changes context construction, retrieval, compression,
budgeting, or redaction.

### Skills / Plugins / MCP

State whether this phase changes skill loading, plugin manifests, or MCP tools.

### Security and Sandbox

State whether this phase changes file writes, command execution, secrets,
network, sandbox, or approval behavior.

## Web UI Requirements

- New UI surfaces.
- State changes.
- Empty/loading/error states.
- Accessibility and responsive concerns.

## Acceptance Criteria

1. ...

## Validation Commands

```bash
npm run typecheck
npm run build
```

## Smoke Tests

Document API or UI smoke checks.

## Migration and Rollback

State data migration, config migration, and rollback path.

## Documentation Requirements

- Design doc:
- Tutorial chapter:
- Blog draft:

## Remaining Risks

- ...
