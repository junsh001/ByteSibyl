# tutorial-writer Skill Final

This package contains the final `tutorial-writer` Codex skill for writing knowledge-teaching blogs and tutorial chapters for the Web AI Coding Agent project.

It emphasizes:

- teaching concepts before code;
- using diagrams and images to explain ideas to readers;
- showing stage-specific implementation code;
- showing visible effects such as UI screenshots, logs, API responses, diffs, traces, and validation output;
- avoiding dry technical design documents.

Install by copying `.skills/tutorial-writer/` into the root of your project.

Recommended Codex prompt:

```text
Use the tutorial-writer skill.

Task:
Write the knowledge-teaching blog and tutorial chapter for Phase <N>.

Read:
1. ROADMAP.md
2. docs/PRODUCT_SPEC.md
3. docs/ARCHITECTURE.md
4. docs/milestones/<phase-file>.md
5. Current phase implementation files
6. .skills/tutorial-writer/templates/knowledge-blog-template.md
7. .skills/tutorial-writer/templates/visual-explanation-template.md

Requirements:
1. The blog must be a knowledge-teaching article, not a technical design document.
2. Explain concepts with diagrams and images whenever helpful.
3. Include real phase code paths and short code excerpts.
4. Include an effect showcase using UI screenshots, API responses, logs, traces, diffs, or validation output.
5. Do not fabricate screenshots or command results.
6. Clearly state current limitations.
```
