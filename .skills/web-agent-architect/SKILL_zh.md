---
name: web-agent-architect
description: 当需要设计或修改 Web AI Coding Agent 项目的架构、模块边界、目录结构时使用。
---

# Web Agent 架构 Skill

## 目标

保持项目架构清晰、可教学、可演进。

项目分为三层：

1. Web IDE 层。
2. Agent Runtime 层。
3. Workspace Execution 层。

最大风险是把 UI 逻辑、agent 推理逻辑、workspace 执行逻辑混在一起。这个 skill 用来防止架构失控。

## 分层模型

```text
Web IDE Layer
  ↓ API / WebSocket / SSE 协议
Agent Runtime Layer
  ↓ 结构化工具调用
Workspace Execution Layer
```

## Web IDE 层

允许职责：

- 文件树展示。
- Monaco 编辑器展示。
- Agent Chat 面板。
- 任务计划面板。
- Diff 预览。
- Terminal 或日志面板。
- Trace 时间线展示。
- 用户审批交互。

禁止职责：

- Agent 推理逻辑。
- 工具选择逻辑。
- Patch 应用逻辑。
- Shell 执行逻辑。
- 权限决策逻辑。
- 上下文压缩逻辑。

## Agent Runtime 层

允许职责：

- Agent loop。
- 状态机。
- Planner / todo 状态。
- 工具调用协议。
- Observation 处理。
- 上下文组装。
- 停止条件。
- Guardrail 决策。
- Trace 事件输出。

禁止职责：

- 直接访问 DOM。
- 前端框架代码。
- 直接修改文件系统。
- 直接执行 shell。
- UI 渲染。

## Workspace Execution 层

允许职责：

- 获取文件列表。
- 读取文件。
- 搜索代码。
- 创建 diff。
- 应用 patch。
- 执行 shell 命令。
- 获取 LSP diagnostics。
- 获取 git diff。
- 限制 workspace 路径边界。

禁止职责：

- 模型推理。
- 任务规划。
- UI 渲染。
- Chat 回复组织。

## 包职责边界

推荐包职责：

- `apps/web`：只放 UI。
- `apps/server`：API、session、事件流、依赖组装。
- `packages/shared`：共享协议和 DTO。
- `packages/agent-core`：agent loop 和状态迁移。
- `packages/tool-system`：工具注册、schema 校验、工具执行协议。
- `packages/workspace`：文件树、文件读取、搜索、workspace 边界。
- `packages/patch-engine`：diff、patch 提案、patch 应用。
- `packages/shell-runner`：命令执行、超时、命令日志。
- `packages/permission`：命令和编辑审批策略。
- `packages/context-engine`：repo map、上下文选择、压缩。
- `packages/planner`：todo 和任务状态。
- `packages/lsp-client`：diagnostics。
- `packages/telemetry`：trace 和 replay 数据。

## 导入规则

- `agent-core` 不能 import `apps/web`。
- `agent-core` 应通过 tools 调用 workspace 能力，而不是调用 UI 代码。
- `apps/web` 只能 import 共享类型、API client、UI 工具。
- `packages/shared` 不能依赖 app 层。
- `workspace`、`patch-engine`、`shell-runner` 不能直接调用模型。
- 权限检查必须显式存在，不能藏在 UI 逻辑中。

## 架构审查清单

批准架构变更前，检查：

1. 职责是否放在正确层？
2. 是否引入循环依赖？
3. 是否让 Web UI 过重？
4. 是否绕过权限策略？
5. 是否提前引入未来阶段复杂度？
6. 这个边界是否能在教程中讲清楚？
7. 共享协议是否放在 `packages/shared`？

## 输出格式

返回：

1. 架构决策。
2. 受影响的包。
3. 允许的依赖方向。
4. 被拒绝的替代方案。
5. 风险。
6. 需要更新的文档。
