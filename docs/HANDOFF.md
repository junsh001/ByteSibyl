# 项目交接摘要

## 项目定位

ByteSibyl 当前主线是 Web AI Coding Agent Lab：一个教学型 Web Coding Agent 项目，用阶段化方式实现 agent 内核机制。

核心目标：

- 让 Web UI 成为学习和操作 agent 的主入口。
- 让 Agent Core 独立于 Web UI。
- 把工具、上下文、patch、权限、shell、diagnostics、trace、eval、skills、hooks、subagents 拆成可解释模块。
- 每个阶段都有代码、设计文档、中文教程和中文博客。

## 当前阶段

当前产品化推进到 P6：Multi-file Patch & Git Output。

已完成的主线：

1. Tutorial Lab Phase 0-19 已完成，作为历史教学计划保留。
2. Productization P0-P5 已完成，Web 已具备项目隔离、真实编辑、sandbox fallback、可恢复任务聊天流。
3. `product/web-ide-foundation` 增加了左目录、中编辑、底部终端/面板、右 AI Chat 的 IDE 基础交互。
4. P6 正在实现多文件 Patch Proposal、逐文件 Review、Git diff 输出和 patch 下载。

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
- `docs/PRODUCTIZATION_DEVELOPMENT_PLAN.md`：产品化阶段计划。
- `docs/product/phases/product-phase-06-multifile-patch-git-output.md`：当前阶段验收标准。
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

当前 P6 要求：

```bash
npm run typecheck
npm run build
git diff --check
```

可选 smoke：

```bash
curl --noproxy '*' http://127.0.0.1:8787/api/health
```

应返回当前 product phase。

## 注意事项

- `data/` 和 `workspaces/` 是运行时目录，已忽略，不提交。
- 当前 session store 是 JSON 文件：`data/session-log.json`。
- 当前不是多用户 SaaS，也不是强 sandbox。
- 当前 Terminal 仍受 Shell Runner 白名单限制，非白名单命令会被 blocked。
- 当前 subagents 是角色/权限 summary，不是并行多 Agent 执行。
- P6 多文件 patch 不自动创建 commit 或 GitHub PR，只生成 patch 和 commit message 草稿。
- P6 conflict 检测使用原内容 hash，不实现复杂 merge。

## 已知本地脏改动

在 Phase 19 开始前，工作树已有一个未纳入提交的示例文件改动：

- `examples/buggy-ts-project/src/index.ts`

它不属于产品化阶段范围。除非用户明确要求，不要提交或回滚它。

## 当前分支和 PR

- 当前 P6 分支：`product/p6-multifile-patch-git-output`。
- 前置 UI 分支：`product/web-ide-foundation`。
- 前置 PR：#25 `完善 Web IDE 基础交互`，base 为 `product/p3-p5-task-workflow`。
- P6 PR 应基于 `product/web-ide-foundation` 创建；如果 #25 已合并，再 retarget 到合并后的产品化主线。

## 下一步建议

P6 完成后继续 P7：Model Routing & Cost Control。

P7 重点：

1. cheap/default/reasoning/reviewer 模型路由。
2. per-run token/cost budget。
3. provider timeout/retry/fallback。
4. Web 展示 usage/cost。
5. 模型调用摘要进入审计，避免泄漏敏感 prompt。
