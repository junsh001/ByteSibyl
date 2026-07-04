# Phase 4: Agent Loop 最小实现

## 目标

实现模型、工具、观察结果之间的最小循环。第一版使用 mock model provider，避免一开始被真实
模型 API、鉴权和 function calling 细节干扰。

## 允许范围

- 新增 `packages/model-provider`。
- 新增 `packages/agent-core`。
- 定义最小 `ModelProvider` 抽象。
- 实现 mock provider。
- 实现 `runAgentLoop()`。
- 支持结构化 tool call。
- 支持 maxIterations。
- 支持 final answer。
- tool error 作为 observation 返回循环，不导致服务崩溃。
- Server 暴露一个 SSE agent run API。
- Web 展示 agent iteration、tool call、tool result 和 final。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不接入真实模型 API。
- 不实现真实 OpenAI/Anthropic/DeepSeek function calling。
- 不实现写文件。
- 不实现 patch。
- 不实现 shell command。
- 不实现 approval/guardrails。
- 不实现 durable session state。
- 不新增生产依赖。

## 必需产物

- `packages/model-provider`
- `packages/agent-core`
- `apps/server/src/routes/agent.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `packages/shared/src/index.ts`
- `docs/design/phase-04-agent-loop.md`
- `docs/tutorial/chapter-04-agent-loop.md`
- `docs/blog/04-model-tool-observation-loop.md`

## 验收标准

1. 用户输入任务后，Agent 可以通过 mock provider 调用 workspace 工具。
2. Web 能显示每次 iteration、tool call、tool result 和 final。
3. 达到 maxIterations 会停止。
4. tool error 会进入 observation，而不是让 run 崩溃。
5. 没有接入真实模型、写文件、命令执行、patch 或 approval。

## 验证命令

```bash
npm run typecheck
npm run build
```
