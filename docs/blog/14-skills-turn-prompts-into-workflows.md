# Skills：把一次性提示词变成可复用工作流

当你反复让 Coding Agent 修 TypeScript 错误、重构 React 组件、写教程文档时，会发现很多提示词其实是重复的。

与其每次都把流程重新说一遍，不如把流程沉淀成 Skill。

## Skill 解决什么问题

一次性提示词的问题是不可复用。它写在某次聊天里，下一次任务还要重新组织语言。

Skill 把这类经验固化成文件：

```text
.skills/typescript-debug/SKILL.md
.skills/react-refactor/SKILL.md
.skills/tutorial-writing/SKILL.md
```

Agent 可以根据任务选择合适的 skill，并把其中的工作流指令加入上下文。

## Skill 不是权限

这是最重要的边界。Skill 不能直接执行命令，不能写文件，也不能绕过审批。

它只回答一个问题：面对这类任务，Agent 应该遵循什么工作流？

例如 TypeScript debug skill 会建议：

- 先看 diagnostics。
- 读取相关文件。
- 生成最小 patch。
- 通过审批后应用。
- 再验证。

真正的文件读取、patch、命令执行仍然必须通过 Tool System、Patch Approval 和 Shell Runner。

## 为什么要记录 skill_selected

如果某次 Agent 表现不同，用户应该能看到它用了什么工作流。Phase 14 把 skill 选择记录成 `agent.skill_selected` 事件。

这让 trace 更可解释：

```text
用户任务：修复 TypeScript 类型错误
命中 skill：typescript-debug
原因：匹配 typecheck / 类型错误 / diagnostics
```

后续分析问题时，不只看模型说了什么，也能看系统给模型注入了什么工作流。

## Web 为什么要显示当前 skill

Web 是这个项目的主入口。用户不应该只能在后端日志里知道 skill 是否生效。

Agent 面板显示：

- 已加载 skill 数量。
- 当前 run 使用的 skill。
- 匹配原因。
- skill 描述。

这能让学习者直观看到“提示词工程”如何变成可观察的系统能力。

## 当前阶段的取舍

Phase 14 只做本地 `.skills` 目录和单 skill 选择。不做远程 marketplace，不做 Hooks，也不做多 skill 合并。

这个取舍是为了保持教学路径清晰：先理解 skill 是上下文工作流，再考虑更复杂的插件系统。

## 小结

Skill 的价值不是让 Agent 获得新权限，而是让它复用稳定的工作方式。把提示词变成文件，把选择过程变成事件，把当前 skill 显示在 Web 上，这就是 Phase 14 的核心。
