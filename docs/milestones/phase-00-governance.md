# Phase 0: Governance

## Objective

Create the governance baseline for the Web AI Coding Agent Lab before changing
runtime code. This phase defines project direction, architectural boundaries,
phase order, documentation expectations, and validation rules.

## Allowed Scope

- Create or update governance files.
- Create or update roadmap and product/architecture documents.
- Create or update tutorial and blog drafts for Chapter 0.
- Tutorial chapters under `docs/tutorial/` and blog drafts under `docs/blog/`
  must be written in Chinese by default.
- Create the project-specific workflow skill.
- Create milestone documentation for Phase 0.

## Forbidden Scope

- Do not write Web UI code.
- Do not write Server code.
- Do not add or change model providers.
- Do not implement agent loop behavior.
- Do not implement workspace tools.
- Do not implement patch editing.
- Do not implement command execution.
- Do not add production dependencies.

## Required Files

- `AGENTS.md`
- `ROADMAP.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/BLOG_PLAN.md`
- `docs/milestones/phase-00-governance.md`
- `skills/web-ai-coding-agent/SKILL.md`
- `docs/tutorial/chapter-00-why-web-ai-coding-agent.md`
- `docs/blog/00-web-ai-coding-agent-is-not-chatbot.md`

## Acceptance Criteria

1. All required files exist.
2. `ROADMAP.md` lists all phases from 0 through 18.
3. `AGENTS.md` forbids implementing future phases early.
4. `skills/web-ai-coding-agent/SKILL.md` defines a code, docs, tutorial, and
   blog workflow.
5. Chapter 0 explains in Chinese why a Web AI Coding Agent is not just a
   chatbot.
6. The blog draft has the matching Phase 0 article written in Chinese.

## Validation Command

```bash
npm run typecheck
```

Phase 0 does not change TypeScript code, but the repository must still typecheck
after governance files are added.

## Final Report Checklist

1. Files created.
2. Files modified.
3. What was implemented.
4. What documentation was written.
5. Commands run.
6. Validation result.
7. Remaining risks.
8. Next phase.
