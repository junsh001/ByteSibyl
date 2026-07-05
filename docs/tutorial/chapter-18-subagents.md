# 第 18 章：Subagents

本章实现最小 Subagents。目标不是做复杂的多 Agent 并行系统，而是给单 Agent 内核增加清晰的角色边界。

## 1. 为什么需要 Subagents

Coding Agent 做任务时常常混合三类工作：

- 规划：理解任务、拆步骤。
- 编码：准备修改。
- 审查：检查 diff 和验证结果。

如果这些能力都放进一个提示词里，权限边界会变模糊。Subagents 可以把角色分开，每个角色有自己的 system prompt、职责和权限。

## 2. 定义共享类型

在 `packages/shared` 中新增：

```ts
export type SubagentRole = 'planner' | 'coder' | 'reviewer';
export type SubagentPermission = 'read_only' | 'write_patch_with_approval';
```

同时定义：

- `SubagentDefinition`
- `SubagentActionDecision`
- `SubagentSummary`
- `SubagentRunSummary`
- `SubagentListResponse`

Agent Run Event 增加：

```ts
{ type: 'agent.subagent_summary'; summary: SubagentRunSummary }
```

## 3. 新增 `packages/subagents`

创建：

```text
packages/subagents
├── package.json
├── tsconfig.json
└── src/index.ts
```

核心类是 `SubagentCoordinator`：

```ts
const subagents = new SubagentCoordinator();
subagents.list();
subagents.run(task);
subagents.decide('planner', 'apply_patch');
```

`list()` 用于 Web 展示角色，`run()` 用于生成本轮 summary，`decide()` 用于角色级权限判断。

## 4. 实现角色权限

Planner 是只读：

- `read_workspace`：allow
- `apply_patch`：deny

Coder 可以准备 patch，但不能直接 apply：

- `preview_patch`：allow
- `apply_patch`：approval_required

Reviewer 可以审查 diff，但不能执行危险命令：

- `review_diff`：allow
- `execute_command`：deny

## 5. 接入 Agent Loop

在 Agent Loop 开始时运行 subagents：

```ts
const subagentSummary = options.subagents?.run(request.message);
```

然后 yield：

```ts
yield {
  type: 'agent.subagent_summary',
  summary: subagentSummary,
};
```

主模型上下文只接收 summary，不接收 subagent 内部上下文。这样可以演示角色隔离，同时避免污染主 session。

## 6. 接入 Server 和 Web

Server 新增：

```text
GET /api/subagents
```

Web 启动时读取角色定义，并在右侧面板展示：

- 角色数量。
- 每个角色的 permission。
- 每个角色职责。
- Agent Loop 运行后的 summary 和决策。

## 7. 验证

运行：

```bash
npm run typecheck
npm run build
```

再启动服务做烟测：

1. `/api/subagents` 返回 3 个角色。
2. 运行 Agent Loop 后，SSE 中出现 `agent.subagent_summary`。
3. Summary 中 planner 的 `apply_patch` 是 deny。
4. Summary 中 coder 的 `apply_patch` 是 approval_required。
5. Summary 中 reviewer 的 `execute_command` 是 deny。

## 小结

Phase 18 建立了最小 Subagents：角色、权限、summary 和 Web 可见性。它不是完整多 Agent 执行系统，但已经把 planner、coder、reviewer 的职责边界放进运行时。
