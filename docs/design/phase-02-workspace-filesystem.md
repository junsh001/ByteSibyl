# Phase 2 设计说明：Workspace 文件系统

## 目标

Phase 2 让 Web AI Coding Agent Lab 第一次接触真实项目文件。Agent 以后要做任何代码
任务，都必须先拥有“眼睛”：能看项目结构、读文件内容、搜索文本，并且不能越过 workspace
边界。

## 边界

本阶段只实现只读 workspace：

- 文件树。
- 读取文本文件。
- 搜索文本。
- 路径逃逸防护。

不实现写文件、patch、命令执行、tool registry 或 agent loop。

## Runtime 包

新增 `packages/workspace`，核心类是 `WorkspaceService`：

- `tree()` 返回 `WorkspaceFileNode`。
- `readTextFile(path)` 返回文本内容。
- `searchText(query)` 返回 `SearchTextMatch[]`。

路径解析统一走 `resolveInside()`。绝对路径和 `..` 逃逸会被拒绝。

## Server API

`apps/server/src/routes/workspace.ts` 暴露：

```text
GET /api/workspace
GET /api/workspace/tree
GET /api/workspace/file?path=<path>
GET /api/workspace/search?q=<query>
```

默认 workspace 根目录是 `examples/buggy-ts-project`，可以通过 `WAC_WORKSPACE_ROOT` 修改。

## Web UI

Web 保留 Phase 1 的五区布局，并把左侧和中间接到真实数据：

- 左侧显示 workspace 文件树。
- 点击文件后，中间 editor 区显示内容。
- 搜索框显示匹配文件、行号、列号和片段。

右侧 Agent 面板、底部命令日志、Diff Approval 仍是后续阶段的占位。

## 当前限制

- 只读文本文件，跳过大文件。
- 搜索是简单大小写不敏感文本搜索。
- 文件树忽略 `.git`、`node_modules`、`dist` 等目录。
- 没有增量索引，后续 Context Engine 阶段再做更系统的 repo map。
