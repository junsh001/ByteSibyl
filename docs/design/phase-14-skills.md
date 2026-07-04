# Phase 14 设计说明：Skills

Phase 14 把重复出现的提示词工作流沉淀为 `SKILL.md` 文件。Skill 是上下文指令，不是权限系统，也不是自动执行器。

## 架构

新增 `packages/skills`，负责：

- 读取 `.skills/*/SKILL.md`。
- 解析 frontmatter manifest。
- 保存 skill 名称、描述、触发词和正文指令。
- 根据任务文本选择最匹配的 skill。

Agent Core 在 run 开始时调用 `SkillRegistry.select(task)`。如果命中 skill：

```text
select skill
emit agent.skill_selected
inject skill instructions as system message
continue Agent Loop
```

Server 负责加载 `.skills` 目录并提供 `/api/skills`。Web 只展示已加载 skill 数量和当前使用的 skill。

## Manifest 格式

本阶段支持最小 frontmatter：

```md
---
name: typescript-debug
description: Diagnose and fix TypeScript typecheck failures.
triggers: typescript, typecheck, 类型错误
---
```

正文作为 skill instructions 注入模型上下文。

## 安全边界

Skill 不能直接执行命令，不能修改文件，不能跳过 Patch Proposal、Approval、Shell Runner 或 Permission。它只告诉 Agent “应该按什么流程思考和调用工具”。

示例：`typescript-debug` 会建议先看 diagnostics，再读相关文件，再走 patch approval；它不会自己运行 typecheck 或写文件。

## Trace

Skill 选择通过 `agent.skill_selected` 事件记录，Server 会把它持久化到 run event 和 step log。这样可以解释某次模型调用为什么带上了某个工作流指令。

## 当前边界

本阶段不实现远程 skill 下载、MCP marketplace、Hooks、subagents 或多 skill 合并。当前只选择一个最匹配的 skill。

## 前端变化

Agent 侧栏新增 `Skills` 面板，显示已加载 skill 数量、当前使用的 skill 和匹配原因。底部日志显示 `skill_selected` 事件。
