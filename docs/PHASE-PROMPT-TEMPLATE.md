# Phase Prompt Template

## Tutorial Lab Phase Template

```text
Use the phase-implementer skill.

Task:
Complete Phase <N>: <phase name> according to docs/milestones/<phase-file>.md.

Before editing, read:
1. AGENTS.md
2. ROADMAP.md
3. docs/PRODUCT_SPEC.md
4. docs/ARCHITECTURE.md
5. web-ai-coding-agent-tutorial-plan.md
6. docs/milestones/<phase-file>.md

Execution constraints:
1. Implement only the allowed scope of this phase.
2. Do not implement forbidden future features.
3. Do not add production dependencies without approval.
4. Keep patches small and reviewable.
5. Update code, design documentation, tutorial chapter, and blog draft together.
6. Run the validation command from the phase file.
7. If validation fails, use validation-fixer and retry up to 3 times.
8. Use code-reviewer before the final report.

Final report must include:
1. Files created.
2. Files modified.
3. What was implemented.
4. Frontend interface changes.
5. What documentation was updated.
6. Commands run.
7. Validation result.
8. Remaining risks.
9. Recommended next phase.
```

## Productization Phase Template

```text
Use the phase-implementer skill.

Task:
Complete Product Phase P<N>: <phase name> according to
docs/product/phases/product-phase-<NN>-<slug>.md.

Before editing, read:
1. AGENTS.md
2. ROADMAP.md
3. docs/PRODUCT_SPEC.md
4. docs/ARCHITECTURE.md
5. docs/PRODUCTIZATION_DEVELOPMENT_PLAN.md
6. docs/product/phases/product-phase-<NN>-<slug>.md
7. docs/engineering/runtime-capability-review.md
8. docs/engineering/product-readiness-gap.md

Execution constraints:
1. Implement only the allowed scope of this product phase.
2. Do not implement future product phases early.
3. Do not add production dependencies without explaining the reason.
4. Keep patches small and reviewable.
5. Update code, Web UI, product phase file, design documentation, tutorial
   chapter, and blog draft together.
6. Explicitly document impact on Memory, Tool Governance, Context Lifecycle,
   Skill/Plugin loading, Security, and Web UI.
7. Run the validation command from the product phase file.
8. If validation fails, use validation-fixer and retry up to 3 times.
9. Use code-reviewer before the final report.

Final report must include:
1. Files created.
2. Files modified.
3. What was implemented.
4. Frontend interface changes.
5. Product documentation written.
6. Tutorial and blog written.
7. Commands run.
8. Validation result.
9. Security and migration notes.
10. Remaining risks.
11. Recommended next phase.
```
