# Product Phase 01: Project Workspace & Git Isolation

## Product Goal

让用户可以把真实 Git 项目作为 ByteSibyl 的工作对象，并让每个 Agent 任务在独立 branch/worktree 中执行，避免污染用户原始 checkout。

## User Value

- 用户不再只能操作 `examples/buggy-ts-project`。
- 用户可以为真实项目创建受控 Agent workspace。
- 每个任务有独立分支和工作目录，便于回滚、导出 patch、生成 commit 或 PR 草稿。

## Allowed Scope

- 新增 Project 和 Task Workspace 的 shared types。
- 新增项目注册和 workspace metadata 存储。
- 新增 Git workspace 服务，支持检测 repo、创建 branch/worktree、读取 changed files。
- 新增 Server API：
  - `POST /api/projects`
  - `GET /api/projects`
  - `POST /api/projects/:id/workspaces`
  - `GET /api/projects/:id/workspaces/:workspaceId`
- Web UI 展示当前 project、branch、workspace path、dirty files。
- Agent Run 可以绑定 task workspace，但本阶段不要求完成多项目并发调度。
- 产出设计文档、中文教程、中文博客。

## Forbidden Scope

- 不实现远程多租户。
- 不实现 GitHub OAuth。
- 不自动 push 或 merge。
- 不实现完整 PR 创建流程。
- 不实现 Docker sandbox。
- 不重写 Agent Loop。
- 不让 Agent 直接写入用户原始 checkout。

## Required Artifacts

- `docs/product/phases/product-phase-01-project-workspace-git-isolation.md`
- `docs/design/product-phase-01-project-workspace-git-isolation.md`
- `docs/tutorial/product-phase-01-project-workspace-git-isolation.md`
- `docs/blog/product-phase-01-project-workspace-git-isolation.md`
- Runtime code for project/workspace registration.
- Web UI project/workspace status surface.
- Validation and smoke checks.

## Architecture Impact

### Memory

新增 workspace-level memory 边界的基础元数据：Project、Task Workspace、branch、worktree path、changed files。暂不实现长期检索记忆。

### Tool Governance

Workspace 工具必须绑定当前 task workspace。工具不得默认读取或写入原始 repo path。

### Context Lifecycle

Context Engine 的 workspace source 应可以来自 task workspace。上下文构建仍由系统控制。

### Skills / Plugins / MCP

本阶段不改变 skill 加载，也不接入 plugins/MCP。

### Security and Sandbox

本阶段降低文件污染风险，但不提供命令级强沙箱。Shell Runner 仍按现有权限策略执行；Docker sandbox 留到 P4。

## Web UI Requirements

- 增加 Project / Workspace 状态区域。
- 显示 project name、repo path、active branch、task workspace id。
- 显示 changed files 数量和列表入口。
- 空状态说明如何创建或选择 project。
- 错误状态展示 Git repo 检测失败、worktree 创建失败等原因。
- 右侧栏以 Codex 插件式问答为主：保留 AI 输入、简化对话流和必要审批动作。
- 隐藏 provider、context、trace、evaluation、hooks、subagents 等内部调试面板，避免普通用户看到教学实现细节。

## Acceptance Criteria

1. 用户可以创建一个 project，指向本地 Git repo。
2. 用户可以为 project 创建 task workspace。
3. task workspace 使用独立 branch/worktree。
4. 原始 checkout 不被 Agent 工具直接修改。
5. Server 能返回 task workspace 的 changed files。
6. Web UI 能展示当前 project/workspace/branch 状态。
7. Agent Run 绑定 workspace 时，workspace tools 读取 task workspace。
8. 文档明确本阶段没有实现 Docker sandbox、PR 创建和多用户隔离。

## Validation Commands

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

## Smoke Tests

```bash
POST /api/projects
GET /api/projects
POST /api/projects/:id/workspaces
GET /api/projects/:id/workspaces/:workspaceId
```

Smoke 需要确认：

- 返回 project id。
- 返回 workspace id、branch、worktree path。
- changed files 初始为空。
- health API 仍正常。

## Migration and Rollback

- 如果新增持久化文件或 schema，需要说明从现有 `data/session-log.json` 的兼容策略。
- 回滚时必须能删除 task worktree，不影响原始 repo。

## Documentation Requirements

- 设计文档说明 Project、Task Workspace、Git Worktree、Agent Run 之间的关系。
- 教程章节以“如何把示例 workspace 扩展为真实 Git 项目”为主线。
- 博客草稿解释为什么产品化第一步必须是 workspace 隔离。

## Remaining Risks

- 本阶段还没有 Docker sandbox。
- 本阶段还没有用户/租户隔离。
- 本阶段只解决文件工作区隔离，不解决不可信命令执行。
