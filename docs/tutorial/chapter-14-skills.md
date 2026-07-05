# 第 14 章：Skills：把提示词沉淀成工作流

前面阶段已经有 Tool System、Agent Loop、Context Engine 和 Todo Planner。接下来要解决另一个问题：如果同类任务反复出现，是否每次都要重新写一长段提示词？

Phase 14 引入 Skills。Skill 是可复用工作流指令，它帮助 Agent 在特定任务中采用一致的操作顺序。

## 1. 本章目标

本章实现：

- `packages/skills`
- `.skills/typescript-debug/SKILL.md`
- `.skills/react-refactor/SKILL.md`
- `.skills/tutorial-writing/SKILL.md`
- `agent.skill_selected` 事件
- Web Skills 面板

## 2. Skill 不是工具

Tool 会执行动作，比如读文件、获取 diagnostics、运行命令。Skill 不执行动作，它只提供流程和规则。

例如 `typescript-debug` 会告诉 Agent：

```text
先读 diagnostics
再看相关文件
优先最小 patch
写文件必须走 Patch Proposal 和 Approval
```

它不会自己运行命令，也不会自己修改文件。

## 3. 编写 SKILL.md

一个最小 skill 文件包含 frontmatter 和正文：

```md
---
name: typescript-debug
description: Diagnose and fix TypeScript typecheck failures.
triggers: typescript, typecheck, 类型错误
---

# TypeScript Debug Skill

Use this workflow when the task asks to diagnose or fix TypeScript errors.
```

`triggers` 用来匹配任务文本，正文会作为 system message 注入 Agent 上下文。

## 4. 解析 skill manifest

`packages/skills` 会扫描 `.skills` 目录，读取每个子目录下的 `SKILL.md`。

解析结果包括：

- `name`
- `description`
- `path`
- `triggers`
- `instructions`

这些信息会被 Server 和 Agent Core 使用。

## 5. 根据任务选择 skill

Agent Core 在 run 开始时选择 skill：

```text
用户任务
  -> SkillRegistry.select(task)
  -> agent.skill_selected
  -> 注入 system message
  -> 继续 Agent Loop
```

如果任务是“修复 TypeScript 类型错误”，会匹配 `typescript-debug`。

## 6. Web 展示

Web 新增 `Skills` 面板：

- Loaded：已加载 skill 数量。
- Current：当前 run 命中的 skill。
- 匹配原因和 skill 描述。

底部日志也会显示 `skill_selected`。

## 7. 验证

运行：

```bash
npm run typecheck
npm run build
```

启动 Server 后检查：

```bash
curl http://127.0.0.1:8787/api/skills
```

运行 TypeScript debug 任务时，SSE 中应出现：

```text
agent.skill_selected typescript-debug
```

## 8. 当前局限

本阶段只选择一个最匹配的 skill，不做多 skill 合并、远程下载、marketplace 或 Hooks。Skill 只是上下文指令，不拥有额外权限。
