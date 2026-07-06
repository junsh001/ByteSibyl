# Product Phase 07 设计：Model Routing 与 Cost Control

## 背景

P6 之后，ByteSibyl 已经可以在 Web IDE 中通过 Chat 触发 Agent Loop、工具调用和 Patch
流程。真实模型接入后，用户会遇到三个产品问题：

1. 不知道当前任务用了哪个模型。
2. 不知道一次运行消耗了多少 token 和成本。
3. provider 失败时只能看到失败耗时，无法继续演示或开发。

P7 的设计目标是把模型调用变成可路由、可预算、可降级、可审计的运行时能力。

## 包边界

- `packages/model-provider`：新增 `ModelRouter`，包装现有 provider adapter。
- `packages/agent-core`：按 run 选择 route，并把 usage/cost/fallback 写入 `ModelCallRecord`。
- `packages/shared`：扩展共享 contract，包括 route、budget、router status 和 `budget_exceeded`。
- `apps/server`：创建 router、暴露 router status、在每次 run 开始时重置 usage。
- `apps/web`：在右侧 AI Chat 上下文区展示 route selector 和本次预算使用量。

Agent Core 仍只依赖 `ModelProvider` 接口，不依赖 Web UI。

## Route 模型

当前定义四类 route：

- `cheap`：适合轻量检查和后续迭代。
- `default`：默认编码模型。
- `reasoning`：预留给复杂推理模型。
- `reviewer`：预留给 review 阶段。

P7 阶段四个 route 都指向同一个底层 provider。这样先稳定 contract 和 UI，再在后续阶段接入更复杂的模型矩阵。

## Budget 流程

`ModelRouter` 维护 per-run usage：

1. Server 在 `/api/agent/run` 开始前调用 `resetUsage()`。
2. 每次 `complete()` 前检查当前 usage 是否已经超过预算。
3. provider 返回后标准化 usage，按配置单价估算 cost。
4. usage/cost 写入 `ModelCallRecord`，用于 Web、session log 和 trace。
5. 下一次调用前如果预算已超过，抛出 `ModelBudgetExceededError`，Agent Run 以
   `budget_exceeded` 停止。

当前预算是单进程内的 per-run 运行时状态，不是团队配额，也不是持久化账单。

## Fallback 流程

真实 provider 失败时，如果 `MODEL_FALLBACK_TO_MOCK=true`，Router 会调用 `MockModelProvider`
继续返回结构化响应，并在 `ModelCallRecord.fallback=true` 中记录。Web 会在聊天状态消息里显示
`fallback=mock`。

缺省策略是保守可用：开发和演示环境中 provider 临时失败不会直接打断整个产品体验。

## 配置

新增配置项：

```text
MODEL_DEFAULT_ROUTE=default
MODEL_BUDGET_MAX_TOKENS=100000
MODEL_BUDGET_MAX_COST_USD=1
MODEL_FALLBACK_TO_MOCK=true
MODEL_INPUT_USD_PER_1K=0.00014
MODEL_OUTPUT_USD_PER_1K=0.00028
```

成本是控制面估算，不代表 provider 官方账单。

## 前端界面变化

右侧 AI Chat 的上下文区新增：

- `Model route` 下拉选择：cheap/default/reasoning/reviewer。
- 本次 run 的 token/cost 使用量和预算。
- fallback 策略提示。

聊天流和底部 Output 中的模型调用消息会显示 route、provider/model、状态、耗时、估算成本和
fallback 状态。

## 风险与后续

- reviewer route 目前没有独立上下文裁剪，只完成 route contract。
- cost 估算依赖静态配置，不能代替真实账单。
- fallback 会保证演示连续性，但 mock 结果不能代表真实模型质量。
- Secret redaction manifest 不在 P7 范围内，属于后续安全治理阶段。
