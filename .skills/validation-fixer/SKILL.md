---
name: validation-fixer
description: Use this skill when typecheck, build, test, lint, or phase validation fails and the failure must be fixed without expanding the project scope.
---

# Validation Fixer Skill

## Purpose

Fix validation failures with the smallest safe change.

This skill is for typecheck/build/test/lint failures. It must not be used as an excuse to refactor unrelated code or implement future phases.

## Required Inputs

Before fixing, collect:

1. Exact command that failed.
2. Full error output.
3. Current phase file.
4. Files changed in the current phase.
5. Relevant package scripts.
6. Recent dependency changes, if any.

## Workflow

1. Identify the failing command.
2. Classify the failure:
   - TypeScript type error.
   - Build configuration error.
   - Test failure.
   - Lint failure.
   - Missing dependency.
   - Runtime path error.
   - Script configuration error.
3. Locate the smallest failing module.
4. Inspect only the files needed to understand the failure.
5. Fix the root cause with the smallest patch.
6. Do not refactor unrelated code.
7. Re-run the failed command.
8. If the command passes, report the fix.
9. If it fails again, retry up to 3 total attempts.
10. If still failing after 3 attempts, stop and write a failure report.

## Hard Rules

- Do not delete tests to make validation pass.
- Do not weaken test assertions.
- Do not disable type checking.
- Do not loosen compiler settings unless explicitly approved.
- Do not remove lint rules unless explicitly approved.
- Do not bypass validation scripts.
- Do not introduce dependencies without approval.
- Do not change architecture to hide an error.
- Do not implement future phase features while fixing validation.

## Common Fix Strategies

Use these strategies before larger changes:

- Add missing exports or imports.
- Correct path aliases.
- Fix TypeScript interface mismatches.
- Align shared DTOs with implementation.
- Correct package references in monorepo config.
- Fix script names in `package.json`.
- Add missing test setup only if required by the current phase.
- Replace unsafe `any` with narrow types where possible.

## Failure Report Format

If unresolved, report:

1. Failing command.
2. Error summary.
3. Full relevant error excerpt.
4. Suspected root cause.
5. Files inspected.
6. Fixes attempted.
7. Why the issue remains unresolved.
8. Human decision needed.

## Success Report Format

If resolved, report:

1. Failing command.
2. Root cause.
3. Files changed.
4. Fix applied.
5. Validation command rerun.
6. Final result.
