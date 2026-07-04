# Phase 14: Skills

## 目标

把一次性提示词沉淀成可复用工作流，让 Agent 可以根据任务选择合适的 skill 指令，并把选择结果记录到事件流。

## 允许范围

- 新增 `packages/skills`。
- 解析 `.skills/*/SKILL.md` 的 manifest 和正文。
- 根据任务文本选择匹配 skill。
- 将 skill 指令作为 system message 注入 Agent 上下文。
- 发出 `agent.skill_selected` 事件，让 skill 选择进入 session log。
- Web 展示已加载 skill 数量和当前使用的 skill。
- 新增示例 skill：`typescript-debug`、`react-refactor`、`tutorial-writing`。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 Hooks。
- 不实现 MCP marketplace。
- 不实现 subagents。
- 不允许 skill 直接执行命令、修改文件或绕过 Tool System。
- 不放宽 Patch Approval、Shell Runner 或 Permission。
- 不实现远程 skill 下载或自动安装。

## 必需产物

- `packages/skills`
- `.skills/typescript-debug/SKILL.md`
- `.skills/react-refactor/SKILL.md`
- `.skills/tutorial-writing/SKILL.md`
- `packages/shared/src/index.ts`
- `packages/agent-core/src/index.ts`
- `apps/server/src/routes/skills.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `docs/design/phase-14-skills.md`
- `docs/tutorial/chapter-14-skills.md`
- `docs/blog/14-skills-turn-prompts-into-workflows.md`

## 验收标准

1. TypeScript debug 任务会加载 `typescript-debug` skill。
2. Skill 不直接执行命令，只提供流程与规则。
3. Skill 选择通过 `agent.skill_selected` 进入 trace / session log。
4. Web 可以显示当前使用的 skill。
5. 前端界面变化必须在总结中说明。

## 验证命令

```bash
npm run typecheck
npm run build
```
