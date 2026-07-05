---
name: react-refactor
description: Refactor React UI code while preserving behavior, component boundaries, and existing styling conventions.
triggers: react, component, jsx, tsx, refactor, ui, 前端, 组件
---

# React Refactor Skill

Use this workflow when the task asks to change React UI behavior or structure.

## Workflow

1. Identify the component that owns the behavior.
2. Keep state transitions close to the existing data flow.
3. Preserve API contracts from `packages/shared`.
4. Keep visual changes consistent with existing CSS patterns.
5. Prefer small component extraction only when it clarifies ownership.
6. Validate with typecheck and build.

## Boundaries

- Do not move Agent Runtime logic into Web UI.
- Do not bypass Server APIs.
- Do not introduce new UI dependencies in this skill.
