# Phase 12: Context Engine

## 目标

控制 Agent 每次模型调用前的上下文窗口，避免把整个仓库和全部历史 observation 原样塞给模型。

## 允许范围

- 新增 `packages/context-engine`。
- 生成 repo map、当前任务摘要、最近 observation 摘要、相关文件列表、当前 diagnostics 摘要。
- 对旧 observation 做压缩计数。
- 通过字符预算控制 context summary 大小。
- Agent Loop 在每次模型调用前输出 `agent.context_summary`。
- Web 展示最近一次 context summary 的预算、相关文件和压缩计数。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 Todo Planner。
- 不实现 Skills、Hooks、Trace Replay 或 Eval。
- 不实现向量索引、embedding 检索或长期记忆。
- 不新增 shell 权限或放宽 command guardrails。
- 不让模型绕过 Tool System、Patch Approval 或 Permission。
- 不自动修改文件。

## 必需产物

- `packages/context-engine`
- `packages/shared/src/index.ts`
- `packages/agent-core/src/index.ts`
- `apps/server/src/index.ts`
- `apps/server/src/config.ts`
- `apps/server/src/routes/agent.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/index.css`
- `docs/design/phase-12-context-engine.md`
- `docs/tutorial/chapter-12-context-engine.md`
- `docs/blog/12-own-your-context-window.md`

## 验收标准

1. 每次模型调用前输出 `agent.context_summary`。
2. Context summary 不超过配置预算 `CONTEXT_BUDGET_CHARS`。
3. 当前 diagnostics 和相关文件优先进入上下文。
4. 旧 tool observation 不再全部展开，只保留压缩计数和最近摘要。
5. Web 可以看到最近 context summary 的预算使用、相关文件数量和压缩 observation 数量。
6. 前端界面变化必须在总结中说明。

## 验证命令

```bash
npm run typecheck
npm run build
```
