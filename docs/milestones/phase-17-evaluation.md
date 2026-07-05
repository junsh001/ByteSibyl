# Phase 17: Evaluation

## 目标

建立可批量运行的 Eval 任务格式和 JSON report，让 Agent 能力不只依赖主观体验判断。

## 允许范围

- 新增 `packages/eval`。
- 新增 `examples/eval-tasks`，至少包含 5 个 eval task。
- 定义 Eval task、result、report 的共享 contract。
- 实现批量 eval runner。
- 输出 JSON report。
- 检测 changed files、forbidden files、command count、runtime 等指标。
- 保留 `npm run eval` CLI 入口。
- Web 展示 Eval task 数量、pass rate、forbidden action count 和任务结果摘要。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 Phase 18 Subagents。
- 不实现远程 benchmark 服务。
- 不新增数据库。
- 不自动修改用户代码。
- 不绕过 Shell Runner 或 permission policy 执行命令。
- 不把 Eval 结果伪装成真实 Agent benchmark 排名。

## 必需产物

- `packages/eval`
- `examples/eval-tasks`
- `scripts/eval/run.ts`
- `packages/shared/src/index.ts`
- `apps/server/src/routes/eval.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/index.css`
- `docs/design/phase-17-evaluation.md`
- `docs/tutorial/chapter-17-evaluation.md`
- `docs/blog/17-how-to-evaluate-coding-agents.md`

## 验收标准

1. 至少 5 个 eval task。
2. 可以批量运行。
3. 输出 JSON report。
4. 能检测是否修改 forbidden files。
5. 前端界面变化必须在总结中说明。

## 验证命令

```bash
npm run typecheck
npm run build
npm run eval
```
