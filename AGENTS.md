# AGENTS.md

## Project Goal

Build a learning-oriented Web AI Coding Agent Lab. The project focuses on
teaching and implementing the core mechanics of coding agents: workspace
context, structured tools, agent loops, session state, patch editing,
permission boundaries, command validation, diagnostics, tracing, and
evaluation.

The goal is not to clone Claude Code, Codex, OpenCode, or any commercial
coding product. The Web UI is the product surface for learning and operating
the agent; the agent kernel must remain independent from the Web layer.

## Hard Rules

1. Work phase by phase.
2. Do not implement future phases early.
3. Every phase must produce code, design documentation, tutorial chapter, and
   blog draft unless the phase file explicitly says otherwise.
4. Tutorial chapters under `docs/tutorial/` and blog drafts under `docs/blog/`
   must be written in Chinese by default. Keep standard English technical terms
   when they are clearer, such as Agent Loop, Tool System, Context Engine, Diff
   Preview, LSP Diagnostics, Guardrails, Trace, and Human-in-the-loop.
5. Web is the main product entry. CLI entry points are only for debugging.
6. Agent core must not depend on Web UI.
7. Shared contracts belong in `packages/shared`.
8. Tools must be structured and schema-validated once the tool-system phase is
   active.
9. File writes and command execution must go through permission checks once the
   permission phase is active.
10. Dangerous commands are forbidden unless the current phase explicitly defines
   an approval path.
11. Do not add production dependencies without explaining the reason.
12. After code changes, run the validation command defined by the current phase
    file.
13. If validation fails three times, stop and write a failure report.

## Phase Discipline

- Phase 0 is governance only: no Web code, no Server code, no model provider,
  no agent loop, no workspace tools, no patch engine, and no shell runner.
- Later phases may refactor existing code, but only inside the current phase
  scope.
- Existing project behavior must not be rewritten casually. Prefer small,
  reviewable changes that move the repository toward the documented package
  boundaries.
- Documentation must describe what was actually implemented in the current
  phase. Planned future behavior must be labeled as planned.
- Tutorial chapters are step-by-step implementation guides. Blog drafts are
  reader-facing knowledge articles, not design documents or changelogs. Write
  both in clear technical Chinese.

## Skill Usage Policy

Use repository skills under `.skills/` when applicable:

- Use `phase-implementer` for milestone implementation.
- Use `web-agent-architect` for architecture and package boundary decisions.
- Use `validation-fixer` for typecheck/build/test failures.
- Use `code-reviewer` before finalizing each phase.
- Use `tutorial-writer` when writing or revising tutorial and blog
  documentation.

The project-specific workflow skill lives at
`skills/web-ai-coding-agent/SKILL.md`. It defines the expected phase workflow
for this tutorial project.

## Final Report Required

At the end of each phase, report:

1. Files created.
2. Files modified.
3. What was implemented.
4. What documentation was written.
5. Commands run.
6. Validation result.
7. Remaining risks.
8. Next phase.
