# Blog Plan

## Tutorial Lab Series

Series title: 从 0 到 1 构建 Web AI Coding Agent

### Publishing Goals

- Tutorial chapters under `docs/tutorial/` and blog drafts under `docs/blog/`
  are written in Chinese by default.
- Keep standard English technical terms when they are clearer, such as Agent
  Loop, Tool System, Context Engine, Diff Preview, LSP Diagnostics, Guardrails,
  Trace, and Human-in-the-loop.
- Explain one agent subsystem per article.
- Keep each article tied to a runnable phase.
- Show engineering tradeoffs, not only final code.
- Make boundaries explicit: what exists now, what is deliberately deferred.

### Article List

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

## Productization Series

Series title: 把 Web AI Coding Agent Lab 做成可用产品

Productization phases still require Chinese tutorial chapters and Chinese blog
drafts. The format changes:

- Tutorial chapters are product implementation guides: requirements, migration,
  code changes, validation, rollback, operational notes.
- Blog drafts are product-engineering articles: user value, risks, architecture
  tradeoffs, rollout strategy, security boundary, and remaining limitations.

### Product Article List

| Product Phase | Tutorial | Blog |
|---|---|---|
| P0 | `docs/tutorial/product-phase-00-product-baseline.md` | `docs/blog/product-phase-00-product-baseline.md` |
| P1 | `docs/tutorial/product-phase-01-project-workspace-git-isolation.md` | `docs/blog/product-phase-01-project-workspace-git-isolation.md` |
| P2 | `docs/tutorial/product-phase-02-real-web-ide-editing.md` | `docs/blog/product-phase-02-real-web-ide-editing.md` |
| P3 | `docs/tutorial/product-phase-03-durable-state-store.md` | `docs/blog/product-phase-03-durable-state-store.md` |
| P4 | `docs/tutorial/product-phase-04-sandbox-runner.md` | `docs/blog/product-phase-04-sandbox-runner.md` |
| P5 | `docs/tutorial/product-phase-05-product-agent-task-loop.md` | `docs/blog/product-phase-05-product-agent-task-loop.md` |
| P6 | `docs/tutorial/product-phase-06-multi-file-patch-git-output.md` | `docs/blog/product-phase-06-multi-file-patch-git-output.md` |
| P7 | `docs/tutorial/product-phase-07-model-routing-cost-control.md` | `docs/blog/product-phase-07-model-routing-cost-control.md` |
| P8 | `docs/tutorial/product-phase-08-ux-hardening.md` | `docs/blog/product-phase-08-ux-hardening.md` |
| P9 | `docs/tutorial/product-phase-09-security-audit.md` | `docs/blog/product-phase-09-security-audit.md` |
| P10 | `docs/tutorial/product-phase-10-team-multi-user.md` | `docs/blog/product-phase-10-team-multi-user.md` |
| P11 | `docs/tutorial/product-phase-11-plugin-mcp-skill-ecosystem.md` | `docs/blog/product-phase-11-plugin-mcp-skill-ecosystem.md` |
| P12 | `docs/tutorial/product-phase-12-continuous-evaluation.md` | `docs/blog/product-phase-12-continuous-evaluation.md` |

### Product Blog Structure

1. 标题。
2. 用户问题和产品目标。
3. 当前 Lab 能力为什么不够。
4. 核心工程设计。
5. 安全、权限、Memory、Tool、Skill、Context 影响。
6. Web UI 变化。
7. 验证和发布策略。
8. 迁移或回滚说明。
9. 当前限制。
10. 下一阶段。
