# Product Phase 01 设计说明：Project Workspace & Git Isolation

## 背景

教学 Lab 阶段默认操作固定示例 workspace。产品化后，用户需要把自己的 Git 项目交给 ByteSibyl，但 Agent 不能直接污染用户正在工作的 checkout。

P1 的设计目标是引入 Project 和 Task Workspace：Project 指向用户的真实 Git repo，Task Workspace 是基于 Git worktree 创建的隔离任务目录。Agent Run、文件读取、Patch Preview、Shell Runner 和 Diagnostics 都应该面向当前激活的 Task Workspace。

## 核心对象

### Project

Project 是用户登记的本地 Git 项目，包含：

- `id`：服务端生成的稳定 id。
- `name`：默认来自 repo 目录名，也可由请求传入。
- `repoPath`：用户输入路径。
- `gitRoot`：通过 `git rev-parse --show-toplevel` 解析后的真实 Git root。
- `defaultBranch`：登记时读取的当前分支。

### Task Workspace

Task Workspace 是一个独立任务工作区，包含：

- `id`：任务工作区 id。
- `projectId`：所属 Project。
- `branch`：为任务创建的隔离分支。
- `worktreePath`：实际工作目录，默认放在 `data/worktrees/<projectId>/<workspaceId>`。
- `baseRef`：创建 worktree 时使用的基线。
- `changedFiles`：通过 `git status --porcelain` 读取的变更文件。

### Active Workspace

本阶段只支持单个 active workspace。创建 Task Workspace 后，Server 会把 WorkspaceService、ShellRunner、DiagnosticsClient 的 root 切换到该 worktree。

这满足 P1 的用户价值，但还不是多项目并发调度。后续阶段需要把 workspace 作为每个 run 的显式依赖，而不是全局 mutable root。

## API 设计

新增 API：

```text
GET  /api/projects
POST /api/projects
GET  /api/projects/:projectId/workspaces
POST /api/projects/:projectId/workspaces
GET  /api/projects/:projectId/workspaces/:workspaceId
```

`POST /api/projects` 负责验证 Git repo 并登记 Project。`POST /api/projects/:projectId/workspaces` 负责创建 branch/worktree 并激活 workspace。

Agent Run 请求新增 `workspaceId`。当 Web 传入 workspace id 时，Server 会先激活该 workspace，再运行 Agent Loop。

## 持久化

P1 使用 JSON 文件存储 Project 和 Task Workspace metadata：

```text
data/projects.json
data/worktrees/
```

这是产品化初期的轻量实现，便于观察和回滚。Durable State Store、迁移和并发锁留到后续产品阶段。

## Web 变化

右侧栏从教学调试面板改成用户工作台：

- 顶部显示当前 Project、branch、changed file count、diagnostics count。
- 用户可以输入 Git repo path 并绑定 Project。
- 用户可以创建隔离 Task Workspace。
- 中间保留 Codex 插件式 AI 对话流，只展示 assistant、状态、工具调用和错误摘要。
- 底部保留任务输入框与 Patch Proposal 审批动作。

provider、context、trace、evaluation、hooks、subagents 等内部数据仍在系统内存在，但不再作为主要用户界面展示。

## 架构影响

### Memory

P1 只建立 workspace-level memory 的身份边界：Project、Task Workspace、branch、worktree path。暂不实现长期 memory 检索或用户偏好记忆。

### Tool Governance

现有工具继续走 Tool System、Permission、Approval 和 Guardrails。P1 的关键变化是工具 root 切到 Task Workspace，避免默认操作原始 checkout。

### Context Lifecycle

Context Engine 仍按当前 workspace 构建上下文。激活 Task Workspace 后，文件树、diagnostics 和读取工具都来自 worktree。

### Skills / Plugins / MCP

本阶段不改变 skill loader，也不新增 plugin 或 MCP。Skills 后续应能读取 Project/Workspace metadata 作为任务上下文。

### Security and Sandbox

P1 是文件工作区隔离，不是命令强沙箱。Shell Runner 仍按现有权限策略执行，Docker/namespace sandbox 留到后续阶段。

## 回滚

回滚代码不会修改用户原始 repo。运行时产生的 metadata 和 worktree 在：

```text
data/projects.json
data/worktrees/
```

如果需要清理某个任务工作区，应使用 `git worktree remove <worktreePath>` 解除 Git worktree 关系，再删除对应 metadata。自动清理 API 不在 P1 范围内。

## 验证

P1 验证命令：

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

Smoke 需要覆盖 project 创建、列表读取、workspace 创建、workspace 详情读取和 health API。

## 已知限制

- 只支持单 active workspace。
- 不自动 push、merge、commit 或创建 PR。
- 不支持 GitHub OAuth。
- 不提供 Docker sandbox。
- 不实现多用户/多租户隔离。
