---
name: typescript-debug
description: Diagnose and fix TypeScript typecheck failures through diagnostics, focused file reading, patch proposal, and verification.
triggers: typescript, typecheck, ts error, 类型错误, 编译错误, diagnostics, tsconfig
---

# TypeScript Debug Skill

Use this workflow when the task asks to diagnose or fix TypeScript errors.

## Workflow

1. Read current diagnostics before proposing a change.
2. Prioritize files referenced by diagnostics.
3. Read the smallest relevant file section before proposing edits.
4. Prefer type-correct minimal patches over broad refactors.
5. Keep file writes behind Patch Proposal and Approval.
6. Verify with the configured typecheck command after an approved patch is applied.

## Boundaries

- Do not install dependencies.
- Do not run shell commands outside Shell Runner.
- Do not edit files directly.
- If diagnostics are empty, say that the current TypeScript feedback source is clean.
