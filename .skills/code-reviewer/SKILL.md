---
name: code-reviewer
description: Use this skill to review changes for scope control, architecture boundaries, safety, validation, and documentation consistency in the Web AI Coding Agent project.
---

# Code Reviewer Skill

## Purpose

Review implementation changes before a phase is finalized.

The review focuses on whether the work stayed inside the phase boundary, preserved architecture separation, followed safety rules, passed validation, and kept documentation synchronized.

## Required Inputs

Before reviewing, inspect:

1. Current phase file under `docs/milestones/`.
2. `AGENTS.md`.
3. `docs/ARCHITECTURE.md`.
4. Changed files.
5. Validation command output.
6. Updated documentation.

If the validation command was not run, mark the review as incomplete.

## Review Areas

### 1. Phase Scope

Check:

- Did the change implement only the current phase?
- Did it implement forbidden future features?
- Did it change unrelated modules?
- Did it add dependencies outside the phase scope?

### 2. Architecture Boundary

Check:

- Does Web UI remain thin?
- Is agent-core independent from Web UI?
- Are shared contracts in `packages/shared`?
- Is workspace execution separated from model reasoning?
- Are tools structured and typed?

### 3. Safety and Permission

Check:

- Are file writes explicit?
- Are command executions controlled?
- Are dangerous commands blocked or approval-gated?
- Are path boundaries enforced where relevant?
- Are secrets or environment files avoided?

### 4. Validation

Check:

- Was the required validation command run?
- Did it pass?
- If it failed, was the failure reported honestly?
- Were tests weakened, removed, or bypassed?
- Were compiler settings loosened without approval?

### 5. Documentation Consistency

Check:

- Was design documentation updated?
- Was the tutorial chapter updated?
- Was the blog draft updated?
- Do docs match actual implementation?
- Are unfinished features clearly marked as limitations?

## Review Result Levels

Use one of:

- `PASS`: Acceptable for the current phase.
- `PASS_WITH_NOTES`: Acceptable, but with minor follow-up items.
- `CHANGES_REQUIRED`: Must fix before finalizing.
- `BLOCKED`: Missing required information, validation, or governance files.

## Output Format

Return:

1. Review result level.
2. Summary.
3. Scope findings.
4. Architecture findings.
5. Safety findings.
6. Validation findings.
7. Documentation findings.
8. Required fixes.
9. Optional improvements.
