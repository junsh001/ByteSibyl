# Product Spec: Web AI Coding Agent Lab

## Product Positioning

Web AI Coding Agent Lab is a browser-based learning environment for building a
coding agent from first principles. It combines a Web IDE surface with a staged
agent runtime so learners can see how each subsystem changes the agent's
behavior.

The product is optimized for teaching agent internals, not for replacing a full
IDE or shipping a multi-tenant SaaS system.

## Target User

- Developers learning how coding agents work internally.
- Builders who want a reference implementation for workspace tools, agent
  loops, approval, patching, diagnostics, tracing, and evaluation.
- Technical writers preparing a Chinese tutorial series around Web AI Coding
  Agents.
- Chinese technical readers who want tutorial chapters and knowledge-teaching
  blog posts tied to each runnable phase.

## Final User Flow

1. The user opens an example workspace in the Web UI.
2. The Web UI displays the file tree, editor, agent chat, todo plan, logs, and
   trace panels.
3. The user asks the agent to fix a coding task.
4. The agent gathers context using workspace tools.
5. The agent runs validation commands through the shell runner.
6. The agent proposes a patch instead of silently modifying files.
7. The Web UI displays the diff and asks for approval.
8. After approval, the patch is applied.
9. The agent validates again.
10. The Web UI shows the final summary, trace, changed files, and remaining
    risks.

## In Scope

- Web IDE shell: file tree, editor, agent panel, todo panel, logs, diff preview.
- Agent runtime: loop, state machine, tools, context, planning, and telemetry.
- Workspace tools: list files, read file, search text, tree view.
- Patch workflow: propose diff, preview, apply after approval.
- Shell execution: safe commands, timeout, captured output.
- LSP diagnostics: TypeScript diagnostics as feedback.
- Guardrails: permission classes, approval interruptions, forbidden actions.
- Evaluation: task files, success commands, changed-file limits, JSON reports.
- Chinese tutorial and Chinese blog artifacts for every phase.

## Out of Scope

- Cloud multi-tenant sandboxing.
- Full VS Code replacement.
- Automatic git push, pull request creation, or remote repository mutation.
- Large-scale multi-agent parallelism before the subagents phase.
- MCP marketplace.
- Support for every language server.
- Long-running background automation.

## First Complete Scenario

The first complete scenario appears after Phase 9:

```text
examples/buggy-ts-project has a TypeScript error.
User: "Fix the typecheck error."
Agent: runs typecheck, reads the error, inspects relevant files, proposes a
patch, waits for approval, applies the patch, runs typecheck again, and reports
the result.
```

## Success Criteria

- The Web UI can demonstrate each phase visibly.
- The agent runtime stays decoupled from the Web UI.
- Tool calls and edits are observable.
- File writes and commands are controlled by explicit policies.
- Each phase has a matching design note, Chinese tutorial chapter, and Chinese
  blog draft.
