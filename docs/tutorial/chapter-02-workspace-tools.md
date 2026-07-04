# 第 2 章：Workspace 文件系统

## 本章目标

本章让 Web 页面看到真实项目文件。完成后，用户可以在左侧看到 example workspace 的文件树，
点击文件后在中间区域查看内容，并通过搜索框查找文本。

这一步是后续 Coding Agent 的基础：Agent 不能只靠用户描述来改代码，它必须能读取项目。

## 为什么需要 Workspace

Agent 的第一项能力不是写代码，而是理解当前项目。没有 workspace 工具，模型只能猜测文件
结构和代码内容；有了 workspace 工具，后续 Agent Loop 才能通过 observation 获取真实信息。

Phase 2 只做只读能力，避免过早引入写文件和权限问题。

## 核心类型

`packages/shared/src/index.ts` 中增加：

- `WorkspaceFileNode`：文件树节点。
- `WorkspaceInfo`：workspace 基本信息。
- `ReadWorkspaceFileResponse`：读取文件响应。
- `SearchTextMatch`：搜索命中。
- `SearchTextResponse`：搜索响应。

## 关键代码

新增 `packages/workspace/src/index.ts`，提供 `WorkspaceService`：

```text
tree()
readTextFile(path)
searchText(query)
```

所有路径都会经过 workspace 根目录校验。绝对路径和 `..` 逃逸会被拒绝。

Server 路由在 `apps/server/src/routes/workspace.ts`：

```text
GET /api/workspace/tree
GET /api/workspace/file?path=README.md
GET /api/workspace/search?q=formatUser
```

Web 入口仍是 `apps/web/src/App.tsx`。它会加载文件树、打开文件并显示搜索结果。

默认 workspace 是 `examples/buggy-ts-project`。如果需要临时切换，可以设置
`WAC_WORKSPACE_ROOT`。

## 运行方式

```bash
npm run dev
```

打开：

```text
http://localhost:5173
```

## 验收方式

运行：

```bash
npm run typecheck
npm run build
```

也可以直接检查 API：

```bash
curl --noproxy '*' http://127.0.0.1:8787/api/workspace/tree
curl --noproxy '*' "http://127.0.0.1:8787/api/workspace/file?path=README.md"
curl --noproxy '*' "http://127.0.0.1:8787/api/workspace/search?q=formatUser"
```

路径逃逸应该被拒绝：

```bash
curl --noproxy '*' "http://127.0.0.1:8787/api/workspace/file?path=../package.json"
```

## 当前局限

- 不写文件。
- 不运行命令。
- 不把这些能力注册为 Agent tool。
- 不做 repo map 和上下文预算。

这些能力分别属于后续 Patch Engine、Shell Runner、Tool System 和 Context Engine 阶段。

## 下一章要解决什么

第 3 章会把这些普通函数升级为 Tool System，让后续 Agent 可以通过结构化 tool call 使用
workspace 能力。
