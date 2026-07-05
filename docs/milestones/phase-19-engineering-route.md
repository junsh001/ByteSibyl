# Phase 19: 工程化路线

## 目标

总结 Web AI Coding Agent Lab 从教学项目走向可用产品的差距，清理明显的历史原型残留，并把当前项目状态整理成后续会话可接手的工程化文档。

## 允许范围

- 更新项目阶段标识到 `phase-19-engineering-route`。
- 清理未被当前架构引用的历史原型包和无效 package 引用。
- 审计项目目录，说明运行时目录、历史目录和当前有效目录。
- 撰写工程化路线文档，覆盖：
  - Docker sandbox。
  - 多 workspace。
  - 多用户隔离。
  - Git 分支与 worktree。
  - 模型路由。
  - 成本控制。
  - Web IDE 性能。
  - 插件系统。
  - MCP 接入。
  - 安全审计。
- 总结长短期记忆管理、工具管理、上下文管理、skill 加载的完成情况和改进方向。
- 总结离“用户真正可以用起来”的差距。
- 写一个下一会话可直接读取的交接文档。
- 撰写设计文档、中文教程章节和中文博客草稿。

## 禁止范围

- 不实现真实云端多租户。
- 不实现 Docker/VM 级强沙箱。
- 不实现 MCP marketplace。
- 不实现插件运行时或远程插件安装。
- 不重写 Agent Loop、Patch Engine、Shell Runner 或 Web IDE。
- 不引入新的生产依赖。

## 必需产物

- `docs/design/phase-19-engineering-route.md`
- `docs/tutorial/chapter-19-from-lab-to-product.md`
- `docs/blog/19-from-web-ai-coding-agent-lab-to-product.md`
- `docs/engineering/repository-audit.md`
- `docs/engineering/runtime-capability-review.md`
- `docs/engineering/product-readiness-gap.md`
- `docs/HANDOFF.md`

## 验收标准

1. 项目目录审计说明 `packages/agent`、`packages/db`、`data/`、`workspaces/` 的定位。
2. 无用历史原型包不再作为当前构建或服务依赖。
3. 文档说明当前能力和改进方向，不把计划能力写成已实现。
4. 前端阶段标识更新为 Phase 19。
5. `/api/health` 返回 `phase-19-engineering-route`。
6. 交接文档能让下一个会话理解当前项目目标、分支状态、验证命令和剩余风险。

## 验证命令

```bash
npm install
npm run typecheck
npm run build
```
