# AGENTS.md

## Project Goal

Build ByteSibyl as a Web AI Coding Agent product in two tracks:

1. **Tutorial Lab track**: Phase 0-19, already completed. This track teaches
   the core mechanics of coding agents: workspace context, structured tools,
   agent loops, session state, patch editing, permission boundaries, command
   validation, diagnostics, tracing, evaluation, and subagents.
2. **Productization track**: P0 onward. This track turns the completed Lab into
   a usable Web AI Coding Agent product with project/workspace isolation,
   durable state, sandbox execution, multi-file patching, product-grade memory,
   tool governance, model routing, audit, and eventually team support.

The goal is not to clone Claude Code, Codex, OpenCode, or any commercial coding
product. The Web UI is the product surface for learning and operating the
agent; the agent kernel must remain independent from the Web layer.

## Hard Rules

1. Work phase by phase.
2. Do not implement future phases early.
3. Every phase, including productization phases, must produce code, design
   documentation, tutorial chapter, and blog draft unless the phase file
   explicitly says otherwise.
4. Tutorial chapters under `docs/tutorial/` and blog drafts under `docs/blog/`
   must be written in Chinese by default. Keep standard English technical terms
   when they are clearer, such as Agent Loop, Tool System, Context Engine, Diff
   Preview, LSP Diagnostics, Guardrails, Trace, Human-in-the-loop, Sandbox,
   Worktree, Memory, MCP, and Plugin.
5. Web is the main product entry. CLI entry points are only for debugging,
   migration, smoke tests, and eval.
6. Agent core must not depend on Web UI.
7. Shared contracts belong in `packages/shared`.
8. Tools must be structured and schema-validated.
9. File writes and command execution must go through permission checks.
10. Dangerous commands are forbidden unless the current phase explicitly defines
    an approval path and sandbox boundary.
11. Do not add production dependencies without explaining the reason.
12. After code changes, run the validation command defined by the current phase
    file.
13. If validation fails three times, stop and write a failure report.
14. Productization phases must include frontend interface changes in final
    reports, even when the change is only labels, status panels, or empty
    states.

## Track Discipline

### Tutorial Lab Track

- Phase 0-19 is complete and preserved as the historical teaching plan in
  `web-ai-coding-agent-tutorial-plan.md`.
- Do not rewrite completed tutorial phases unless the user explicitly asks for
  correction or retrospective cleanup.
- Existing tutorial chapters and blog drafts remain Chinese knowledge-teaching
  materials tied to runnable Lab phases.

### Productization Track

- Productization work follows `docs/PRODUCTIZATION_DEVELOPMENT_PLAN.md`.
- Product phase requirements live under `docs/product/phases/`.
- Product design notes live under `docs/design/`.
- Product tutorial chapters still live under `docs/tutorial/`, but their style
  changes from "build this teaching module" to "implement this product
  capability safely".
- Product blog drafts still live under `docs/blog/`, but their style changes
  from knowledge articles to product-engineering articles: user value, risk,
  tradeoffs, rollout, validation, and remaining limitations.
- Productization phases may refactor earlier Lab code, but only inside the
  current product phase scope.
- Documentation must describe what was actually implemented in the current
  product phase. Planned behavior must be labeled as planned.

## Productization Required Artifacts

Every productization phase must create or update:

1. `docs/product/phases/product-phase-xx-*.md`: product requirement,
   acceptance criteria, rollout notes, and validation command.
2. `docs/design/product-phase-xx-*.md`: engineering design and package
   boundaries.
3. `docs/tutorial/product-phase-xx-*.md`: Chinese implementation tutorial for
   the product capability.
4. `docs/blog/product-phase-xx-*.md`: Chinese product-engineering blog draft.
5. Runtime code and Web UI changes required by the phase.
6. Tests, eval tasks, or smoke checks proportional to the risk.

## Productization Architecture Rules

- User project writes must happen in an isolated workspace, branch, or worktree
  once P1 is active.
- Shell execution must move toward sandbox providers. A product phase may keep a
  local fallback only if the risk and limitation are documented.
- Memory must be explicit and layered: conversation memory, run memory,
  workspace memory, project memory, and user preference memory must not be
  conflated.
- Tool governance must track tool name, schema, permission, risk, source,
  version, and audit records once the relevant product phase introduces them.
- Skill loading must become manifest-driven before remote plugins or MCP tools
  are allowed.
- Context construction must stay system-controlled. The model may request
  context, but it must not own unrestricted file ingestion.
- Secrets must not be sent to model providers, sandbox commands, logs, traces,
  or eval outputs unless a phase explicitly defines a redacted and approved
  path.

## Skill Usage Policy

Use repository skills under `.skills/` when applicable:

- Use `phase-implementer` for milestone implementation.
- Use `web-agent-architect` for architecture and package boundary decisions.
- Use `validation-fixer` for typecheck/build/test failures.
- Use `code-reviewer` before finalizing each phase.
- Use `tutorial-writer` when writing or revising tutorial and blog
  documentation.

The project-specific workflow skill lives at
`skills/web-ai-coding-agent/SKILL.md`. It defines the expected workflow for both
the completed tutorial track and the active productization track.

## Final Report Required

At the end of each phase, report:

1. Files created.
2. Files modified.
3. What was implemented.
4. Frontend interface changes.
5. What documentation was written.
6. Commands run.
7. Validation result.
8. Remaining risks.
9. Next phase.
