# Product Phase 07: Model Routing & Cost Control

## Phase

P7: Model Routing & Cost Control

## Product Goal

让真实模型使用可控、可观测、可降级。用户可以看到本次任务的 token /
cost 预算，模型失败时系统可以按策略 fallback 到 mock provider，避免任务只显示
`failed 10563ms`。

## User Value

- 用户能看到当前 provider、router role、预算和已使用量。
- 超预算时 Agent 明确停止，而不是继续消耗模型调用。
- 真实 provider 失败时可以 fallback 到 mock，用于继续开发和演示。

## Allowed Scope

- 新增 Model Router，不替换现有 provider adapter。
- 新增 per-run budget、usage/cost 估算、fallback 和 provider health 状态。
- Web 展示模型路由与预算状态。
- 模型调用记录继续进入现有 session log / trace。

## Forbidden Scope

- 不实现 P8 UX hardening 的完整 toast、快捷键、虚拟化。
- 不实现 P9 安全审计、secret redaction manifest。
- 不实现真实计费账单或团队配额。
- 不引入新的生产依赖。
- 不把 API key 或完整 prompt 输出到 Web。

## Required Artifacts

- `docs/product/phases/product-phase-07-model-routing-cost-control.md`
- `docs/design/product-phase-07-model-routing-cost-control.md`
- `docs/tutorial/product-phase-07-model-routing-cost-control.md`
- `docs/blog/product-phase-07-model-routing-cost-control.md`
- Runtime code.
- Web UI changes.
- Smoke checks.

## Architecture Impact

### Memory

不新增 memory 层。预算超限和模型失败会作为 task message / model call record 进入现有 session。

### Tool Governance

不改变工具权限和 schema。

### Context Lifecycle

Router 可以按 role 选择模型，但不改变 Context Engine 的文件选择、压缩和预算策略。

### Skills / Plugins / MCP

不改变 skill、plugin 或 MCP。

### Security and Sandbox

不新增 secret 暴露路径。Web 只展示 provider、model、状态、预算和错误摘要，不展示 API key
或完整 prompt。

## Web UI Requirements

- AI Chat 或 Learn 能显示当前 provider、model、router role。
- 展示本次 session 的 token / cost 使用量和预算。
- 模型失败时聊天中显示可理解的错误摘要。
- fallback 到 mock 时显示 fallback 状态。

## Acceptance Criteria

1. Server 使用 Model Router 调用模型。
2. Router 支持 cheap、default、reasoning、reviewer 角色配置。
3. 每个 Agent Run 有 token/cost budget。
4. 超预算时 run 停止并解释。
5. Provider 失败时可以 fallback 到 mock。
6. Web 能看到当前任务 token/cost 使用量。

## Validation Commands

```bash
npm run typecheck
npm run build
git diff --check
```

## Smoke Tests

- `MODEL_PROVIDER=mock` 时 Agent Loop 正常完成模型调用。
- 低 token budget 时 Agent Loop 返回 budget exceeded。
- openai-compatible provider 失败时 fallback 到 mock 并记录 fallback。

## Migration and Rollback

无数据库迁移。Router 包装现有 provider；回滚时恢复 server 注入裸 provider 即可。

## Documentation Requirements

- Design doc: router role、budget、fallback、usage flow。
- Tutorial chapter: 如何实现可控模型调用。
- Blog draft: 为什么 Coding Agent 需要成本和降级边界。

## Remaining Risks

- cost 估算使用静态单价配置，不等同于 provider 官方账单。
- 不同 provider 的 tool calling 兼容性仍可能不同。
- P7 不做 secret redaction manifest，该能力属于 P9。
