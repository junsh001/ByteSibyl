# Web AI Coding Agent Skill

## Purpose

Use this skill when implementing phases of the Web AI Coding Agent Lab and its
productization track.

The project has two tracks:

1. **Tutorial Lab track**: Phase 0-19, completed. It teaches coding-agent
   internals through runnable milestones.
2. **Productization track**: P0 onward. It turns the Lab into a usable Web AI
   Coding Agent product with project isolation, sandboxing, durable state,
   memory, tool governance, model routing, UX hardening, audit, and team
   support.

## Required Reading

Before editing for any phase, read:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `docs/PRODUCT_SPEC.md`
4. `docs/ARCHITECTURE.md`
5. The active plan:
   - Tutorial phases: `web-ai-coding-agent-tutorial-plan.md`
   - Productization phases: `docs/PRODUCTIZATION_DEVELOPMENT_PLAN.md`
6. The current phase file:
   - Tutorial phases: `docs/milestones/phase-xx-*.md`
   - Productization phases: `docs/product/phases/product-phase-xx-*.md`

If the current productization phase file does not exist, create it first from
`docs/product/templates/product-phase-template.md` before runtime edits.

## Productization Workflow

1. Identify the product phase objective and user value.
2. Extract allowed scope, forbidden scope, required files, validation command,
   rollout notes, and acceptance criteria from the product phase file.
3. Implement only the current product phase.
4. Keep runtime code, Web UI, product requirement, design doc, tutorial chapter,
   and blog draft aligned.
5. Productization tutorial chapters still go under `docs/tutorial/` and must be
   written in Chinese. They should explain how to implement the product
   capability safely, including setup, code changes, validation, rollback, and
   operational concerns.
6. Productization blog drafts still go under `docs/blog/` and must be written
   in Chinese. They should be product-engineering articles, not changelogs:
   user value, risk boundary, architecture tradeoffs, rollout strategy,
   validation, and remaining limitations.
7. Do not describe future behavior as implemented.
8. Run the validation command from the phase file.
9. If validation fails, fix within the phase scope and retry up to three times.
10. Stop and write a failure report if the same validation issue remains after
    three attempts.

## Tutorial Phase Workflow

For historical Phase 0-19 work, keep the original workflow:

1. Identify the current tutorial phase objective.
2. Extract allowed scope, forbidden scope, required files, validation command,
   and acceptance criteria from `docs/milestones/`.
3. Implement only the current tutorial phase.
4. Keep runtime code, design docs, tutorial chapter, and blog draft aligned.
5. Write tutorial chapters and blog drafts in Chinese.
6. Run validation from the milestone file.

Do not reopen completed tutorial phases unless the user explicitly asks for a
correction.

## Architecture Rules

- Web UI stays thin and renders state from the server.
- Server owns session lifecycle, API boundaries, dependency assembly, and event
  streaming.
- Agent core does not import Web UI code.
- Shared DTOs and event types belong in `packages/shared`.
- Tool calls must be structured, schema-validated actions.
- File edits must flow through patch proposal and approval.
- Command execution must flow through shell-runner, permission policy, and
  sandbox provider once the relevant product phase is active.
- Trace records must make model calls, tool calls, edits, approvals, commands,
  sandbox results, memory updates, and audit events observable once those
  capabilities exist.

## Productization-Specific Rules

- Workspace isolation is a prerequisite for expanding autonomous editing.
- Product phases must explicitly state how they affect memory, tool governance,
  context construction, skills/plugins, security, and Web UI.
- Memory must be layered: conversation, run, workspace, project, and user
  preference.
- Tool governance must record schema, permission, source, version, risk class,
  and audit trail when introduced.
- Skill loading must become manifest-driven before remote plugins or MCP tools
  are allowed.
- Product phase docs must distinguish implemented behavior from planned
  rollout.
- Frontend interface changes must be included in final summaries.

## Documentation Rules

Every productization phase should include:

- A product phase file under `docs/product/phases/`.
- A design document under `docs/design/`.
- A Chinese tutorial chapter under `docs/tutorial/`.
- A Chinese blog draft under `docs/blog/`.

Productization tutorial chapters are implementation guides for product
capabilities. Productization blogs are product-engineering articles. They should
not read like internal commit summaries.

## Final Report

Report:

1. Phase name.
2. Files created.
3. Files modified.
4. What works.
5. Frontend interface changes.
6. Validation result.
7. Remaining risks.
8. Next recommended phase.
