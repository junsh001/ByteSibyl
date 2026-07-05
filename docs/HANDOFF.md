# 项目交接摘要

## 项目定位

ByteSibyl 当前主线是 Web AI Coding Agent Lab：一个教学型 Web Coding Agent 项目，用阶段化方式实现 agent 内核机制。

核心目标：

- 让 Web UI 成为学习和操作 agent 的主入口。
- 让 Agent Core 独立于 Web UI。
- 把工具、上下文、patch、权限、shell、diagnostics、trace、eval、skills、hooks、subagents 拆成可解释模块。
- 每个阶段都有代码、设计文档、中文教程和中文博客。

## 当前阶段

当前完成到 Phase 19：工程化路线。

Phase 19 做了四件事：

1. 清理历史原型包 `packages/agent` 和 `packages/db`。
2. 输出仓库目录审计。
3. 总结 memory、tools、context、skills 的完成情况和改进方向。
4. 总结离真正产品可用的差距，并写出交接文档。

## 当前主要入口

- Web：`apps/web`
- Server：`apps/server`
- Agent Loop：`packages/agent-core`
- Model Provider：`packages/model-provider`
- Tool System：`packages/tool-system`
- Workspace：`packages/workspace`
- Patch：`packages/patch-engine`
- Permission：`packages/permission`
- Shell：`packages/shell-runner`
- Session/Trace：`packages/telemetry`
- Context：`packages/context-engine`
- Skills：`packages/skills`
- Hooks：`packages/hooks`
- Subagents：`packages/subagents`

## 关键文档

- `AGENTS.md`：项目规则。
- `web-ai-coding-agent-tutorial-plan.md`：总计划。
- `ROADMAP.md`：阶段路线。
- `docs/ARCHITECTURE.md`：架构边界。
- `docs/PRODUCT_SPEC.md`：产品定位。
- `docs/milestones/phase-19-engineering-route.md`：当前阶段验收标准。
- `docs/engineering/repository-audit.md`：目录审计。
- `docs/engineering/runtime-capability-review.md`：runtime 能力总结。
- `docs/engineering/product-readiness-gap.md`：产品化差距。

## 本地运行

```bash
npm install
npm run typecheck
npm run build
PORT=8787 MODEL_PROVIDER=mock npm start
```

真实模型：

```text
MODEL_PROVIDER=openai_compatible
deepseek_KEY=...
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-chat
```

## 验证命令

当前阶段 milestone 要求：

```bash
npm install
npm run typecheck
npm run build
```

可选 smoke：

```bash
curl --noproxy '*' http://127.0.0.1:8787/api/health
```

应返回 `phase-19-engineering-route`。

## 注意事项

- `data/` 和 `workspaces/` 是运行时目录，已忽略，不提交。
- 当前 session store 是 JSON 文件：`data/session-log.json`。
- 当前不是多用户 SaaS，也不是强 sandbox。
- 当前 Web 编辑区仍偏展示和 patch draft，不是完整 IDE 编辑器。
- 当前 subagents 是角色/权限 summary，不是并行多 Agent 执行。

## 已知本地脏改动

在 Phase 19 开始前，工作树已有一个未纳入提交的示例文件改动：

- `examples/buggy-ts-project/src/index.ts`

它不属于 Phase 19 清理范围。除非用户明确要求，不要提交或回滚它。

## 下一步建议

如果继续产品化，建议从以下方向开新阶段：

1. Git workspace/worktree 隔离。
2. Docker sandbox 执行。
3. 多文件 Patch 与更完整 Diff Apply。
4. Conversation memory 和 long-running task resume。
5. 数据库存储替代 JSON SessionStore。
