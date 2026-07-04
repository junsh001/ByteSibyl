# Phase 9 设计：Self-Repair Loop

Phase 9 把前面几个阶段串成第一个闭环：验证失败、提出修复、人工审批、应用 Patch、重新验证。
重点不是“自动把代码改好”，而是展示 coding agent 的安全边界。

## 边界

Self-Repair Loop 只编排已有能力：

- Shell Runner 运行白名单安全命令。
- Self-Repair Planner 根据失败结果生成 Patch Proposal。
- Patch Engine 生成 Diff Preview。
- Permission 和 Approval 决定能否应用。
- Workspace 写入只发生在已批准 Patch Apply 阶段。

它不会绕过审批直接写文件，也不会调用未来阶段的 LSP Diagnostics、Context Engine 或真实模型。

## API

`POST /api/self-repair/start`

1. 创建或复用 session。
2. 运行 `npm run typecheck`，或请求里传入的安全命令。
3. 如果命令通过，记录 `verified` attempt。
4. 如果命令失败，调用 `@wac/self-repair` 生成 Patch Proposal。
5. 对 proposal 执行 permission policy。
6. 创建 approval request，并把 proposal 标记为 `waiting_approval`。

`POST /api/self-repair/verify`

1. 要求 session 存在。
2. 如果传入 patchId，要求 Patch 已经 `applied`。
3. 重新运行验证命令。
4. 记录 `verified` 或 `failed` attempt。

## 教学用修复器

当前 `@wac/self-repair` 是确定性 heuristic。它只处理示例工程里的 TypeScript 数字字段被字符串赋值问题：

```ts
score: '42'
```

会被转换成：

```ts
score: 42
```

如果没有找到这个模式，修复器返回 `blocked`，不会猜测修改。Phase 9 不实现多轮自动 retry
或完整失败报告生成器；这些能力需要更完整的 Agent 集成、Trace 和诊断输入后再做。

## 前端界面变化

Agent Chat 右侧新增 `Self-Repair Loop` 面板：

- 输入验证命令，默认 `npm run typecheck`。
- 点击“运行自修复循环”后展示 repair 状态和消息。
- 失败时自动把生成的 proposal 显示到 Diff Preview。
- 复用 Patch Draft、审批、批准、应用按钮。
- Patch 应用后可点击“重新验证”。
- Session State 增加 Repairs 计数。
- 底部日志显示最近 self-repair attempt。

## 状态模型

`SelfRepairAttempt` 记录一次循环摘要：

- `checking`
- `verified`
- `proposed_patch`
- `waiting_approval`
- `ready_to_verify`
- `failed`
- `blocked`

当前实现主要使用 `verified`、`waiting_approval`、`failed` 和 `blocked`。其他状态保留给后续更细粒度的 UI 展示。
