---
name: phase-implementer
description: Use this skill when implementing exactly one milestone phase of the Web AI Coding Agent project, including code, design documentation, tutorial chapter, blog draft, and validation.
---

# Phase Implementer Skill

## Purpose

Implement exactly one milestone phase of the Web AI Coding Agent project.

The project is a teaching-oriented Web AI Coding Agent. The primary goal is to understand and implement coding-agent internals: agent loop, tool system, context engineering, patch editing, permission policy, validation loop, tracing, and evaluation. The Web UI is the product surface, not the place for agent-core logic.

## Required Reading

Before editing files, read:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/ARCHITECTURE.md`
5. The current phase file under `docs/milestones/`

If any required file is missing, stop and report the missing file instead of guessing the phase scope.

## Phase Extraction

From the current phase file, extract:

1. Phase objective.
2. Allowed scope.
3. Forbidden scope.
4. Required files.
5. Required documentation.
6. Validation command.
7. Acceptance criteria.
8. Final report format.

Do not begin implementation until these items are clear.

## Standard Workflow

1. Restate the phase objective in one short paragraph.
2. List the files that will be created or modified.
3. Confirm the forbidden scope.
4. Implement only the current phase.
5. Keep changes small and reviewable.
6. Update matching design documentation.
7. Update matching Chinese tutorial chapter.
8. Update matching Chinese blog draft.
9. Run the validation command from the phase file.
10. If validation fails, use the `validation-fixer` workflow and retry up to 3 times.
11. Use the `code-reviewer` workflow before final reporting.
12. Produce the final report.

## Hard Rules

- Do not implement future phases.
- Do not add VS Code extension, MCP, cloud sandbox, subagents, or evals before their phase.
- Do not introduce production dependencies without explaining the need and asking for approval.
- Do not rewrite unrelated modules.
- Do not hide validation failures.
- Do not claim validation passed unless the command was actually run.
- Keep `agent-core` independent from `apps/web`.
- Keep UI thin; agent logic belongs in packages.
- Shared contracts belong in `packages/shared`.
- File-writing and command-running features must go through permission policy once those modules exist.
- Prefer minimal patches over large rewrites.

## Documentation Requirements

Every implementation phase must update or create:

1. A design document under `docs/design/`.
2. A Chinese tutorial chapter under `docs/tutorial/`.
3. A Chinese blog draft under `docs/blog/`.

The documentation must match the actual implementation. Do not describe features as implemented if they are only planned.

## Final Report Format

Return:

1. Phase name.
2. Files created.
3. Files modified.
4. What was implemented.
5. What documentation was updated.
6. Commands run.
7. Validation result.
8. Scope boundaries respected.
9. Remaining limitations.
10. Recommended next phase.

## Stop Conditions

Stop and report instead of continuing if:

1. Required governance files are missing.
2. The phase file has no validation command.
3. The task would require implementing a forbidden future feature.
4. A dependency is required but not approved.
5. The same validation failure persists after 3 fix attempts.
