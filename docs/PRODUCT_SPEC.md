# Product Spec: Web AI Coding Agent Lab

## Product Positioning

Web AI Coding Agent Lab started as a browser-based learning environment for
building a coding agent from first principles. Phase 0-19 completed that Lab.

The next productization track turns the Lab into a usable Web AI Coding Agent:
a Web workspace where a user can import a real project, ask an AI agent to make
bounded code changes, inspect traces and diffs, approve patches, run validation
in isolation, and export the result.

The product is still not a full IDE replacement and not a public multi-tenant
SaaS by default. Productization starts with a single-user and private-deployment
MVP, then moves toward team usage.

## Target Users

### Lab Users

- Developers learning how coding agents work internally.
- Builders who want a reference implementation for workspace tools, agent
  loops, approval, patching, diagnostics, tracing, evaluation, skills, hooks,
  and subagents.
- Technical writers preparing Chinese tutorial and blog content around Web AI
  Coding Agents.

### Product Users

- Individual developers who want a controlled browser-based coding agent for
  small projects.
- Small teams that want a private deployment for AI-assisted maintenance tasks.
- Agent builders who need an inspectable reference product for sandboxing,
  memory, tool governance, and audit.

## Product Milestones

### Single-user MVP

The user can:

1. Import or select a local Git project.
2. Create an isolated task workspace using branch/worktree.
3. Ask the agent to fix or implement a small scoped task.
4. Watch the agent gather context, run commands, and propose a multi-file diff.
5. Approve or reject changes.
6. Re-run validation after apply.
7. Export a patch, commit draft, or PR draft.

### Private Beta

The deployment can:

1. Run commands in a sandbox provider.
2. Persist sessions, tasks, patches, commands, model calls, traces, and memory.
3. Recover interrupted tasks.
4. Enforce project-level policies.
5. Redact secrets from logs, prompts, traces, and sandbox environments.
6. Run regression evals before release.

### Team Product

The product can:

1. Authenticate users.
2. Isolate tenant/project workspaces.
3. Enforce quota and model budgets.
4. Provide team audit logs.
5. Govern plugins, MCP tools, and skills through manifests and permissions.

## Core User Flow

```text
User selects a project
  -> Server creates project workspace metadata
  -> Git layer creates branch/worktree for a task
  -> User submits an Agent task
  -> Agent builds context and task memory
  -> Agent runs allowed tools and sandboxed commands
  -> Agent proposes multi-file Patch Proposal
  -> Web UI displays Diff, Trace, command outputs, and risk notes
  -> User approves, rejects, or asks for changes
  -> Patch is applied only after approval
  -> Agent validates again
  -> User exports commit/patch/PR draft
```

## In Scope

- Web IDE surface: file tree, editor, agent panel, todo panel, logs, trace,
  diagnostics, diff preview, approval, and project/workspace status.
- Project workspace isolation: Git branch/worktree or equivalent isolated
  workspace.
- Agent runtime: loop, task state machine, tools, memory, context, planning,
  subagents, telemetry.
- Workspace tools: list files, read file, search text, tree view, changed file
  status.
- Patch workflow: multi-file diff, preview, approval, apply, conflict handling,
  rollback note.
- Shell execution: safe command classification, sandbox provider, timeout,
  captured output.
- LSP diagnostics: TypeScript first, extensible later.
- Guardrails: permission classes, approval interruptions, forbidden actions,
  policy manifests.
- Memory: conversation, run, workspace, project, and user preference memory with
  clear boundaries.
- Tool governance: schema, permission, source, version, risk class, audit.
- Skill and plugin governance: local skills first; manifest-driven plugins and
  MCP tools later.
- Evaluation: task files, regression suite, success commands, changed-file
  limits, JSON reports.
- Chinese tutorial and Chinese blog artifacts for every product phase.

## Out of Scope for Single-user MVP

- Public cloud multi-tenant SaaS.
- Full VS Code replacement.
- Automatic PR merge.
- Long-running unattended background development.
- Arbitrary untrusted code execution without sandbox support.
- MCP marketplace.
- Support for every language server.

## Memory Requirements

Memory must be explicit and layered:

- **Conversation memory**: what the user asked across turns.
- **Run memory**: what happened in the current run.
- **Workspace memory**: files, diagnostics, commands, recent diffs.
- **Project memory**: stable project facts, build commands, conventions.
- **User preference memory**: style and policy preferences.

No product phase may merge these into an opaque prompt blob without documenting
what is stored, when it is retrieved, and how it is audited.

## Tool and Skill Requirements

Tools must remain structured and governed:

- Tool schema validation is mandatory.
- Tool permissions must be explicit.
- Tool source, version, risk class, and audit trail become mandatory as product
  governance matures.

Skills must remain inspectable:

- Local skills may be loaded from `.skills`.
- Product skills need manifests before remote loading.
- MCP and plugin tools must not bypass permission, audit, or sandbox policy.

## Success Criteria

- The Web UI can operate on a real small project, not only examples.
- Agent changes happen in isolated workspaces.
- Tool calls, memory updates, model calls, file edits, approvals, and commands
  are observable.
- File writes and commands are controlled by explicit policies.
- Patch output can be reviewed and exported.
- Validation results are visible and reproducible.
- Each product phase has a product requirement, design note, Chinese tutorial
  chapter, Chinese blog draft, and validation result.
