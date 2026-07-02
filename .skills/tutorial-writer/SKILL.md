---
name: tutorial-writer
description: Use this skill to write knowledge-teaching blogs and tutorial chapters for each phase of the Web AI Coding Agent project, with diagrams, images, code walkthroughs, and effect showcases.
---

# Tutorial Writer Skill

## Purpose

Use this skill when writing a knowledge-teaching blog post or tutorial chapter for a phase of the Web AI Coding Agent project.

The output must teach readers how a Web AI Coding Agent works. It must not read like an internal technical design document.

The writing should combine:

1. Concept explanation.
2. Visual explanation.
3. Stage-specific implementation.
4. Real code excerpts.
5. Effect showcase.
6. Design trade-offs.
7. Current limitations.
8. Next-step preview.

## Default Language

Unless the phase file or user prompt explicitly requests another language, write the blog and tutorial in Chinese.

Use clear technical Chinese. Keep English technical terms when they are standard, such as Agent Loop, Tool System, Context Engine, Diff Preview, LSP Diagnostics, Guardrails, Trace, and Human-in-the-loop.

## Required Reading

Before writing, read:

1. `ROADMAP.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. The current phase file under `docs/milestones/`
5. The current phase implementation files
6. `docs/design/` documents related to the phase, if present
7. Existing tutorial/blog drafts, if present
8. Templates under `.skills/tutorial-writer/templates/`

## Writing Goal

Each blog should help the reader answer three questions:

1. What concept am I learning in this phase?
2. Why does a Web AI Coding Agent need this concept?
3. How does the current phase code implement the concept?

## What This Skill Must Produce

For each phase, produce or update:

1. A knowledge-teaching blog draft under `docs/blog/`.
2. A tutorial chapter under `docs/tutorial/`.
3. Optional visual assets under `docs/blog/assets/phase-XX/`.
4. Optional image notes or screenshot TODOs when real screenshots are not available.

## Blog Is Not a Technical Design Document

Do not write the blog as:

- module inventory only;
- API reference only;
- implementation changelog only;
- dry architecture specification;
- internal engineering notes.

The blog must be educational. It should explain ideas to readers who want to understand agent design.

## Recommended Blog Structure

Use `.skills/tutorial-writer/templates/knowledge-blog-template.md`.

Required sections:

1. Title.
2. Opening problem.
3. Core concept.
4. Visual explanation.
5. How this phase implements it.
6. Code walkthrough.
7. Effect showcase.
8. Design trade-offs.
9. Current limitations.
10. Summary.
11. Next chapter preview.

## Visual Explanation Rules

Every knowledge-teaching blog should use images or diagrams whenever they help the reader understand the concept.

Prefer visual formats in this order:

1. Mermaid diagrams for precise flowcharts, architecture diagrams, sequence diagrams, and state machines.
2. SVG diagrams for reusable polished teaching illustrations.
3. Screenshots for Web UI, Diff Preview, Agent Trace, terminal logs, API responses, or validation output.
4. AI-generated illustrations only for covers, banners, or abstract concept images.
5. ASCII diagrams only for very small inline explanations.

Use diagrams to explain ideas, not as decoration.

Each blog should include at least:

1. One concept diagram.
2. One implementation flow diagram, architecture diagram, sequence diagram, or state machine diagram.
3. One effect showcase using a screenshot, API response, terminal output, diff preview, agent trace, or validation result.

If the project cannot provide a real screenshot or image yet:

- Do not fabricate it.
- Add a clear screenshot placeholder or TODO.
- Prefer Mermaid or SVG concept diagrams instead.

## Mermaid Rules

Use Mermaid for:

- Agent Loop
- Tool call flow
- Web UI → Server → Agent → Tool sequence
- Context construction pipeline
- Patch proposal and apply flow
- Permission/approval decision flow
- Validation and self-repair loop
- LSP diagnostics feedback loop
- Planner/Todo state transitions
- Skills/Hooks lifecycle
- Trace/Replay process

After every Mermaid diagram, add a paragraph explaining:

1. What starts the flow.
2. What each major node means.
3. Where the current phase code fits.
4. What has not been implemented yet.

## Image Asset Rules

If creating image files, save them under:

`docs/blog/assets/phase-XX/`

Use clear names:

- `agent-loop-concept.svg`
- `web-runtime-workspace-architecture.svg`
- `tool-call-sequence.svg`
- `diff-preview-effect.png`
- `validation-output.png`

If a generated image is used, include a short note explaining its purpose.

Do not use AI-generated images for precise architecture diagrams when Mermaid or SVG is more accurate.

## Code Walkthrough Rules

The blog must include real code paths from the current phase.

Code excerpts should be short and focused.

Do not paste entire files unless the file is intentionally tiny.

For each code excerpt, explain:

1. Where the file is located.
2. What problem this code solves.
3. How it connects to the concept.
4. What is intentionally left for later phases.

Recommended format:

```md
`packages/tool-system/src/tool.ts`

```ts
export interface Tool<I, O> {
  name: string;
  description: string;
  run(input: I, ctx: ToolContext): Promise<O>;
}
```

这段代码的重点不是接口本身，而是把 Agent 能做的动作变成可注册、可校验、可审计的结构化能力。
```

## Effect Showcase Rules

Every phase blog must include an effect showcase section.

Use whichever is available:

1. Web UI screenshot.
2. API response.
3. Terminal command output.
4. Validation output.
5. Agent trace.
6. Diff preview.
7. Event stream.
8. LSP diagnostics example.

Do not fabricate outputs.

If an output cannot be generated, write:

```md
> 当前阶段还没有可截图的 UI 效果。这里先用 Mermaid 图展示交互过程，下一阶段接入真实页面后再补充截图。
```

## Tutorial Chapter Rules

A tutorial chapter can be more step-by-step than the blog.

Use `.skills/tutorial-writer/templates/tutorial-chapter-template.md`.

Each tutorial chapter must include:

1. Learning objectives.
2. Prerequisites.
3. What we will build.
4. Concept explanation.
5. Visual explanation.
6. Implementation steps.
7. Code walkthrough.
8. Run and verify.
9. Effect showcase.
10. Common mistakes.
11. Current limitations.
12. Next chapter.

## Reference Style

The writing style should be inspired by:

- DeepLearning.AI LangGraph: explain agent loop from first principles.
- LangChain Academy LangGraph: explain state, long-running workflows, and human-in-the-loop.
- Hugging Face Agents Course: explain tools, agent behavior, and evaluation in a learner-friendly way.
- OpenAI Agents SDK docs: highlight guardrails, approvals, tracing, and structured tools.
- Claude Agent SDK / Claude Code docs: explain files, commands, editing, permissions, hooks, and skills as coding-agent capabilities.
- 12-Factor Agents: emphasize production-grade boundaries, explicit state, human control, and reliable workflows.

Do not copy their text. Use them only as teaching style references.

## Style Rules

Use this tone:

- clear;
- educational;
- concrete;
- technically accurate;
- not promotional;
- not exaggerated.

Avoid:

- empty slogans;
- saying a feature is complete when it is not;
- unexplained jargon;
- long code dumps;
- fake screenshots;
- fake benchmark results;
- future features presented as current results.

## Required Checklist Before Finalizing

Use `.skills/tutorial-writer/templates/phase-blog-checklist.md`.

The final blog must pass these checks:

1. Is it a knowledge-teaching article rather than a design document?
2. Does it explain one core concept clearly?
3. Does it include at least one concept diagram?
4. Does it include one flow/sequence/architecture/state diagram?
5. Does it include real code paths?
6. Does it include short code excerpts?
7. Does it include an effect showcase?
8. Does it avoid fabricated screenshots or command outputs?
9. Does it state limitations?
10. Does it connect to the next phase?

## Final Report

After writing or updating the blog/tutorial, report:

1. Files created.
2. Files modified.
3. Diagrams added.
4. Image assets added.
5. Code paths referenced.
6. Effect showcase included.
7. Limitations stated.
8. Any screenshots or assets still needed.
