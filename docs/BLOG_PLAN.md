# Blog Plan

Series title: 从 0 到 1 构建 Web AI Coding Agent

## Publishing Goals

- Tutorial chapters under `docs/tutorial/` and blog drafts under `docs/blog/`
  are written in Chinese by default.
- Keep standard English technical terms when they are clearer, such as Agent
  Loop, Tool System, Context Engine, Diff Preview, LSP Diagnostics, Guardrails,
  Trace, and Human-in-the-loop.
- Explain one agent subsystem per article.
- Keep each article tied to a runnable phase.
- Show engineering tradeoffs, not only final code.
- Make boundaries explicit: what exists now, what is deliberately deferred.

## Article List

| Phase | Draft |
|---|---|
| 0 | `docs/blog/00-web-ai-coding-agent-is-not-chatbot.md` |
| 1 | `docs/blog/01-web-ai-coding-shell.md` |
| 2 | `docs/blog/02-agent-needs-workspace-tools.md` |
| 3 | `docs/blog/03-tools-are-structured-outputs.md` |
| 4 | `docs/blog/04-model-tool-observation-loop.md` |
| 5 | `docs/blog/05-agent-needs-session-state.md` |
| 6 | `docs/blog/06-diff-preview-before-file-write.md` |
| 7 | `docs/blog/07-approval-is-a-state-machine.md` |
| 8 | `docs/blog/08-shell-runner-is-not-a-terminal.md` |
| 9 | `docs/blog/09-self-repair-loop-needs-human-boundaries.md` |
| 10 | `docs/blog/10-model-provider-integration-for-coding-agents.md` |
| 11 | `docs/blog/11-compiler-feedback-for-coding-agents.md` |
| 12 | `docs/blog/12-own-your-context-window.md` |
| 13 | `docs/blog/13-todo-is-agent-state-machine.md` |
| 14 | `docs/blog/14-skills-turn-prompts-into-workflows.md` |
| 15 | `docs/blog/15-hooks-are-deterministic-agent-control.md` |
| 16 | `docs/blog/16-observability-for-coding-agents.md` |
| 17 | `docs/blog/17-how-to-evaluate-coding-agents.md` |
| 18 | `docs/blog/18-small-focused-agents.md` |
| 19 | `docs/blog/19-from-web-ai-coding-agent-lab-to-product.md` |

## Standard Article Structure

1. 标题。
2. 问题背景。
3. 常见误区。
4. 核心设计思想。
5. 最小实现。
6. 运行效果。
7. 工程取舍。
8. 总结。
