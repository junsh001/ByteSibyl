# Phase 11: LSP Diagnostics

## 目标

把 TypeScript diagnostics 接入 Web 和 Agent Loop，让编译器反馈成为结构化 observation。

## 允许范围

- 新增 `packages/lsp-client`，提供 workspace diagnostics provider。
- 在 Server 增加 LSP 装配模块和 `/api/diagnostics`。
- 注册只读工具 `get_diagnostics`。
- Web 展示 diagnostics 列表、错误数量和刷新入口。
- 文件应用 Patch、自修复验证后刷新 diagnostics。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现 Context Engine。
- 不实现 Todo Planner。
- 不实现自动依赖安装。
- 不放宽 patch approval、shell runner 或 permission guardrails。
- 不让模型直接读取本地 API key 或绕过 Tool System。
- 不实现多语言 LSP、多 workspace 索引或持久后台任务。

## 必需产物

- `packages/lsp-client`
- `apps/server/src/lsp`
- `apps/server/src/routes/diagnostics.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `packages/shared/src/index.ts`
- `packages/tool-system/src/index.ts`
- `docs/design/phase-11-lsp-diagnostics.md`
- `docs/tutorial/chapter-11-lsp-diagnostics.md`
- `docs/blog/11-compiler-feedback-for-coding-agents.md`

## 验收标准

1. Server 返回 TypeScript diagnostics。
2. Web 可以展示 diagnostics 的 file、line、column、message、severity。
3. Agent 可以调用 `get_diagnostics`。
4. Diagnostics 刷新不绕过文件写入审批。
5. 应用 Patch 或自修复验证后会刷新 diagnostics。
6. 文档说明当前实现边界：使用 TypeScript compiler API 产出 LSP-shaped diagnostics，尚未维护持久 tsserver 进程。
7. 前端界面变化必须在总结中说明。

## 验证命令

```bash
npm run typecheck
npm run build
```
