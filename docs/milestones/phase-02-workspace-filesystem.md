# Phase 2: Workspace 文件系统

## 目标

让 Web 能看到真实 workspace，让后续 Agent 拥有只读上下文入口。本阶段实现文件树、
读取文件、搜索文本和路径逃逸防护。

## 允许范围

- 新增 `packages/workspace`。
- Server 暴露 workspace 只读 API。
- Web 展示真实文件树。
- Web 点击文件后展示内容。
- Web 提供文本搜索并显示路径、行号、列号和片段。
- 限制路径不能逃逸 workspace 根目录。
- 新增 example workspace。
- 撰写设计文档、中文教程和中文博客。

## 禁止范围

- 不实现写文件。
- 不实现 patch。
- 不实现 shell command。
- 不实现 Tool System 注册。
- 不实现 Agent Loop。
- 不接入模型 provider。
- 不实现 approval/guardrails。
- 不新增生产依赖。

## 必需产物

- `packages/workspace`
- `apps/server/src/routes/workspace.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/api.ts`
- `packages/shared/src/index.ts`
- `examples/buggy-ts-project`
- `docs/design/phase-02-workspace-filesystem.md`
- `docs/tutorial/chapter-02-workspace-tools.md`
- `docs/blog/02-agent-needs-workspace-tools.md`

## 验收标准

1. Web 能展示 example workspace 文件树。
2. 点击文件能显示内容。
3. 搜索文本能返回路径、行号、列号和片段。
4. Server 无法读取 workspace 外部路径。
5. 没有新增写文件、命令执行、patch 或 Agent Loop 行为。

## 验证命令

```bash
npm run typecheck
npm run build
```
