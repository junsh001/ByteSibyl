# Phase Prompt Template

```text
Use the phase-implementer skill.

Task:
Complete Phase <N>: <phase name> according to docs/milestones/<phase-file>.md.

Before editing, read:
1. AGENTS.md
2. ROADMAP.md
3. docs/PRODUCT_SPEC.md
4. docs/ARCHITECTURE.md
5. docs/milestones/<phase-file>.md

Execution constraints:
1. Implement only the allowed scope of this phase.
2. Do not implement forbidden future features.
3. Do not add production dependencies without approval.
4. Keep patches small and reviewable.
5. Update code, design documentation, tutorial chapter, and blog draft together.
   Tutorial chapters under `docs/tutorial/` and blog drafts under `docs/blog/`
   must be written in Chinese unless the user explicitly requests another
   language.
6. Run the validation command from the phase file.
7. If validation fails, use validation-fixer and retry up to 3 times.
8. Use code-reviewer before the final report.

Final report must include:
1. Files created.
2. Files modified.
3. What was implemented.
4. What documentation was updated.
5. Commands run.
6. Validation result.
7. Remaining risks.
8. Recommended next phase.
```
