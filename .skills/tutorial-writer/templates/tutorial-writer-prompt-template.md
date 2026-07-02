# Tutorial Writer 调用提示词模板

```text
Use the tutorial-writer skill.

Task:
Write the knowledge-teaching blog and tutorial chapter for Phase <N>: <phase name>.

Read first:
1. ROADMAP.md
2. docs/PRODUCT_SPEC.md
3. docs/ARCHITECTURE.md
4. docs/milestones/<phase-file>.md
5. Current phase implementation files
6. .skills/tutorial-writer/templates/knowledge-blog-template.md
7. .skills/tutorial-writer/templates/tutorial-chapter-template.md
8. .skills/tutorial-writer/templates/visual-explanation-template.md
9. .skills/tutorial-writer/templates/phase-blog-checklist.md

Output files:
1. docs/blog/<phase-blog-name>.md
2. docs/tutorial/<chapter-name>.md

Requirements:
1. Write a knowledge-teaching article, not a technical design document.
2. Explain the core concept before showing code.
3. Include at least one concept diagram.
4. Include at least one flow, sequence, architecture, or state diagram.
5. Use Mermaid or SVG for precise diagrams.
6. Use screenshots only if real screenshots are available.
7. Do not fabricate screenshots, command outputs, test results, traces, or diffs.
8. Include real phase code paths and short code excerpts.
9. Include an effect showcase section.
10. Clearly state current limitations.
11. Explain what the next phase will add.
12. Run the checklist before finalizing.

Final report:
1. Blog file created or updated.
2. Tutorial file created or updated.
3. Diagrams added.
4. Image assets added or requested.
5. Code paths referenced.
6. Effect showcase included.
7. Limitations stated.
```
