# Phase 18 Subagents 设计说明

## 背景

单 Agent 已经具备工具、权限、Patch、Shell、Trace 和 Eval。Phase 18 引入最小 Subagents，让一个任务可以被拆成不同角色的责任边界。

本阶段重点不是并行执行，而是角色隔离：不同 subagent 拥有不同 system prompt、职责和权限。

## 角色

Planner Subagent：

- 权限：`read_only`
- 职责：拆解任务、选择上下文、输出只读计划
- 禁止：写文件、apply patch、执行命令

Coder Subagent：

- 权限：`write_patch_with_approval`
- 职责：准备 Patch Proposal、说明修改意图
- 边界：apply patch 必须经过 Human-in-the-loop approval

Reviewer Subagent：

- 权限：`read_only`
- 职责：审查 Diff Preview 和验证结果
- 禁止：写文件、执行危险命令

## 包边界

`packages/subagents` 提供 `SubagentCoordinator`：

- `list()` 返回角色定义。
- `run(task)` 生成本轮 subagent summary。
- `decide(role, action)` 给出角色对动作的权限判断。

`packages/shared` 定义跨层 contract：

- `SubagentRole`
- `SubagentDefinition`
- `SubagentActionDecision`
- `SubagentSummary`
- `SubagentRunSummary`
- `SubagentListResponse`

## Agent Loop 接入

Agent Loop 在每次 run 开始时调用：

```ts
const subagentSummary = options.subagents?.run(request.message);
```

然后发出：

```ts
{ type: "agent.subagent_summary", summary }
```

主模型上下文只接收 summary，不接收 subagent 的完整内部上下文。这满足“主 session 只接收 subagent summary”的边界。

## 权限模型

Planner：

- `read_workspace` allow
- `apply_patch` deny

Coder：

- `preview_patch` allow
- `apply_patch` approval_required
- `execute_command` deny

Reviewer：

- `read_workspace` allow
- `review_diff` allow
- `execute_command` deny

注意：这些权限不替代现有 Permission、Approval、Shell Runner 和 Hooks。它们是角色级约束，底层执行仍走已有安全边界。

## Web 变化

Web 右侧新增 Subagents 区块：

- 展示 planner、coder、reviewer。
- 展示每个角色权限和职责。
- 运行 Agent Loop 后展示最近 subagent summary 和动作决策。

## 当前边界

本阶段不实现并行 subagent、不做远程 worker、不让每个 subagent 单独调用模型。它先建立角色、权限和 summary 事件，为后续产品化多角色执行打基础。
