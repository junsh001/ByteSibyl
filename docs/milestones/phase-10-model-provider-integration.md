# Phase 10: Model Provider Integration

## 目标

把 Phase 4 的 mock model-provider 替换为可配置的真实模型 provider adapter，让 Agent Loop
可以调用大模型 API，同时保持 Tool System、Permission、Patch Approval 和 Shell Runner 的确定性边界。

## 允许范围

- 扩展 `packages/model-provider`，新增真实 provider adapter。
- 支持 DeepSeek 或 OpenAI 兼容 API 的基础配置。
- 从环境变量读取 API key、base URL、model name 和 timeout。
- 为 model request/response 定义最小 usage、latency、error 记录。
- Server 可按配置选择 mock provider 或真实 provider。
- Web 展示当前 provider、模型名和连接状态。
- Agent Loop 继续使用结构化 tool calls，不允许模型绕过 tool registry。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 Context Engine。
- 不实现 LSP Diagnostics。
- 不实现自动安装依赖。
- 不放宽 shell command guardrails。
- 不允许模型直接写文件。
- 不把 API key 暴露给 Web 前端。
- 不实现多 provider 路由、成本优化或批量 eval。

## 必需产物

- `packages/model-provider`
- `packages/shared/src/index.ts`
- `packages/telemetry/src/index.ts`
- `apps/server/src/config.ts`
- `apps/server/src/index.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `docs/design/phase-10-model-provider-integration.md`
- `docs/tutorial/chapter-10-model-provider-integration.md`
- `docs/blog/10-model-provider-integration-for-coding-agents.md`

## 验收标准

1. 默认仍可使用 mock provider，方便离线教学。
2. 配置 API key 后，Server 可以使用真实模型 provider。
3. Web 不接触 API key，只展示 provider 状态。
4. Agent Loop 的工具调用仍经过 Tool System schema validation。
5. 文件写入仍必须走 Patch Proposal 和 Approval。
6. Shell 命令仍必须走 Shell Runner 和 permission policy。
7. Model 调用失败、超时和空响应有清晰错误状态。
8. 文档明确真实模型能力与确定性 guardrails 的关系。

## 验证命令

```bash
npm run typecheck
npm run build
```
