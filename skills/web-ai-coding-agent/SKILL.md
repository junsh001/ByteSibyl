# Web AI Coding Agent Skill

## Purpose

Use this skill when implementing phases of the Web AI Coding Agent Lab. The
project is a teaching-oriented coding-agent implementation where each phase must
produce code, design documentation, a tutorial chapter, and a blog draft.

## Required Reading

Before editing for any phase, read:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/ARCHITECTURE.md`
5. The current phase file under `docs/milestones/`

## Phase Workflow

1. Identify the current phase objective.
2. Extract allowed scope, forbidden scope, required files, validation command,
   and acceptance criteria from the phase file.
3. Implement only the current phase.
4. Keep runtime code, design docs, tutorial chapter, and blog draft aligned.
5. Write tutorial chapters under `docs/tutorial/` and blog drafts under
   `docs/blog/` in Chinese unless the user explicitly requests another
   language. Keep standard English technical terms when they are clearer, such
   as Agent Loop, Tool System, Context Engine, Diff Preview, LSP Diagnostics,
   Guardrails, Trace, and Human-in-the-loop.
6. Do not describe future behavior as implemented.
7. Run the validation command from the phase file.
8. If validation fails, fix within the phase scope and retry up to three times.
9. Stop and write a failure report if the same validation issue remains after
   three attempts.

## Architecture Rules

- Web UI stays thin and renders state from the server.
- Server owns session lifecycle, API boundaries, and event streaming.
- Agent core does not import Web UI code.
- Shared DTOs and event types belong in `packages/shared`.
- Tool calls must become structured, schema-validated actions.
- File edits must flow through patch proposal and approval once those phases
  exist.
- Command execution must flow through shell-runner and permission policy once
  those phases exist.
- Trace records must make model calls, tool calls, edits, approvals, and command
  results observable once telemetry exists.

## Documentation Rules

Each implementation phase should include:

- A design document under `docs/design/`.
- A Chinese tutorial chapter under `docs/tutorial/`.
- A Chinese blog draft under `docs/blog/`.
- A milestone file under `docs/milestones/`.

Phase 0 is governance-only and may create the baseline documents without
runtime code changes.

## Tutorial and Blog Language Rule

Tutorial chapters and blog drafts are written in clear technical Chinese by
default, not in English. Tutorials are step-by-step implementation guides. Blogs
are reader-facing knowledge articles. Do not turn the blog into a design
document, release note, or implementation checklist. When an English term is the
common technical term, keep it in English and explain it in Chinese context.

## Final Report

Report:

1. Phase name.
2. Files created.
3. Files modified.
4. What works.
5. Validation result.
6. Remaining risks.
7. Next recommended phase.
