# Product Phase 01 教程：把 Agent 放进隔离的 Git Workspace

## 目标

本章把固定示例 workspace 扩展为真实 Git 项目入口。用户可以登记一个本地 Git repo，并为每个任务创建独立 branch/worktree。Agent、文件树、Diagnostics、Patch Preview 和 Shell Runner 都面向当前激活的 Task Workspace。

这一步解决的是“不要直接改用户原始 checkout”。它不是 Docker sandbox，也不会自动 push、merge 或创建 PR。

## 1. 增加 shared contracts

在 `packages/shared` 中定义 Project 和 Task Workspace：

```ts
export interface ProjectRecord {
  id: string;
  name: string;
  repoPath: string;
  gitRoot: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWorkspaceRecord {
  id: string;
  projectId: string;
  branch: string;
  worktreePath: string;
  baseRef: string;
  status: 'creating' | 'active' | 'failed' | 'removed';
  changedFiles: string[];
  createdAt: string;
  updatedAt: string;
}
```

Agent Run 请求增加 `workspaceId`，让 Web 可以把一次运行绑定到指定 Task Workspace。

## 2. 实现 ProjectWorkspaceStore

在 `packages/workspace` 增加 metadata store。它负责：

- 用 `git rev-parse --show-toplevel` 验证 repo。
- 用 `git branch --show-current` 记录默认分支。
- 用 `git worktree add -b <branch> <path> <baseRef>` 创建隔离目录。
- 用 `git status --porcelain` 读取 changed files。
- 把 Project/Workspace metadata 写入 `data/projects.json`。

本阶段选择 JSON 文件是为了降低产品化初期复杂度。后续 Durable State Store 阶段再处理 schema migration、并发锁和审计。

## 3. Server 接入 API

新增路由：

```text
GET  /api/projects
POST /api/projects
GET  /api/projects/:projectId/workspaces
POST /api/projects/:projectId/workspaces
GET  /api/projects/:projectId/workspaces/:workspaceId
```

创建 Task Workspace 后，Server 调用 `activateWorkspace`：

```ts
workspace.setRoot(active.worktreePath);
shellRunner.setWorkspaceRoot(active.worktreePath);
diagnostics.setWorkspaceRoot(active.worktreePath);
```

这样文件树、文件读取、Patch、Shell 和 Diagnostics 都会转向隔离 worktree。

## 4. Web 改为产品入口

右侧栏不再展示 provider、trace、context、evaluation、hooks、subagents 等内部调试信息。P1 的产品界面只保留用户需要操作的内容：

- 绑定 Git 项目。
- 创建隔离工作区。
- 查看当前 branch、worktree path、changed files、diagnostics 数量。
- 输入 AI 任务。
- 查看简化对话流。
- 生成 Diff、请求审批、批准、应用 Patch。

这种界面更接近 Codex 插件式问答：用户主要和 AI 任务框交互，内部运行细节留在底部日志或后续观察页。

## 5. 验证

运行：

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

Smoke 建议使用临时 Git repo，避免污染当前仓库：

```bash
mkdir -p /tmp/bytesibyl-p1-smoke
cd /tmp/bytesibyl-p1-smoke
git init
git config user.name "ByteSibyl Smoke"
git config user.email "smoke@example.local"
printf "hello\n" > README.md
git add README.md
git commit -m "init"
```

启动 Server 后调用：

```bash
curl -s http://127.0.0.1:8800/api/health
curl -s -X POST http://127.0.0.1:8800/api/projects \
  -H 'content-type: application/json' \
  -d '{"repoPath":"/tmp/bytesibyl-p1-smoke"}'
```

再用返回的 project id 创建 workspace：

```bash
curl -s -X POST http://127.0.0.1:8800/api/projects/<projectId>/workspaces \
  -H 'content-type: application/json' \
  -d '{"branchName":"bytesibyl/p1-smoke"}'
```

确认返回 `workspace.id`、`branch`、`worktreePath`，并且初始 `changedFiles` 为空。

## 6. 回滚

P1 运行数据在：

```text
data/projects.json
data/worktrees/
```

清理 worktree 时先执行：

```bash
git worktree remove <worktreePath>
```

再删除对应 metadata。不要直接删除用户原始 repo。

## 7. 边界

本阶段没有实现：

- Docker sandbox。
- GitHub OAuth。
- 自动 commit、push、merge。
- 自动 PR 创建。
- 多用户隔离。
- 多项目并发 Agent 调度。

P1 只把 Agent 的文件工作区放到可回滚、可观察的 Git worktree 中。
