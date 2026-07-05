# 离用户真正可用还差什么

当前项目已经能演示一个 Web Coding Agent 的核心机制，但离“用户可以拿来完成小型项目并稳定运行”还有明显差距。

## 已经具备的基础

用户已经可以看到：

- 文件树、编辑区、Agent Chat、日志、Todo、Trace、Diff Preview。
- mock 或真实 OpenAI-compatible 模型调用。
- 结构化工具调用。
- Patch Proposal 和 Human-in-the-loop approval。
- Shell Runner 执行受控命令。
- TypeScript diagnostics。
- Context summary。
- Self-Repair Loop。
- Eval。
- Skills、Hooks、Subagents 的最小机制。

这说明项目已经有“可解释 agent loop”的骨架。

## 最大差距

### 1. Workspace 隔离不够

当前默认 workspace 是一个本地目录。真实用户需要：

- 从 Git repo 创建独立 workspace。
- 每个任务使用独立 branch/worktree。
- 支持回滚。
- 支持生成 PR。
- 不污染用户原始工作区。

### 2. 沙箱强度不够

当前 Shell Runner 是进程级约束和命令策略，适合教学，不适合不可信用户代码。

产品化需要：

- Docker / Firecracker / gVisor / sandbox service。
- 网络策略。
- CPU、内存、磁盘、进程数限制。
- secret 隔离。
- 文件系统快照和清理。

### 3. 多轮对话还不够产品化

当前多轮 session 可以持久化事件，但 agent 每次 run 主要重新构建上下文。

需要：

- conversation summary。
- 用户意图延续。
- task-level state。
- “继续上次任务”的恢复逻辑。
- 长任务暂停、恢复和超时管理。

### 4. Patch 与编辑体验还偏教学

当前 Patch Engine 能 preview/apply，但还需要：

- 更接近 git diff 的展示和 apply。
- 多文件 patch。
- conflict handling。
- 用户局部接受/拒绝。
- 自动格式化和测试后的二次 diff。

### 5. 模型能力和路由还简单

当前 provider 已能接真实 API，但缺少：

- 模型路由。
- fallback。
- retry/backoff。
- cost budget。
- per-run usage limit。
- reviewer 模型和 coder 模型拆分。

### 6. Web IDE 还不是高强度工作台

需要：

- 真正可编辑代码区域。
- 大文件保护。
- 文件树虚拟化。
- 日志分页。
- Trace lazy loading。
- diff 高亮和定位。
- 任务状态通知。

### 7. 安全审计还需系统化

已有 trace 和 hooks，但产品化还需要：

- 不可篡改审计日志。
- approval reason。
- secret access policy。
- command allowlist/denylist 版本化。
- 用户/租户/项目级权限。

## 推荐产品化路线

第一阶段：让单用户小项目真正可用。

1. Git clone/import。
2. 每个任务创建 worktree/branch。
3. Docker sandbox。
4. 多文件 patch。
5. Web 编辑区可写。
6. 真实模型默认配置。
7. 一键运行测试。

第二阶段：让长任务稳定。

1. Durable task state。
2. Conversation memory summary。
3. Run resume。
4. Trace pagination。
5. Model retry/fallback。

第三阶段：让多人使用。

1. Auth。
2. 多 tenant workspace。
3. Quota 和 cost control。
4. 审计日志。
5. 数据库持久化。

第四阶段：扩展生态。

1. Plugin manifest。
2. MCP 接入。
3. Skill marketplace。
4. Tool permission review。

## 目前是否能让用户完成小型项目

可以完成教学级小任务，例如：

- 修复 TypeScript 类型错误。
- 读取和总结文件。
- 生成一个小 patch proposal。
- 运行一次验证命令。

还不适合承诺：

- 端到端创建完整应用。
- 长时间无人值守开发。
- 不可信代码执行。
- 多用户 SaaS。
- 自动 PR 合并。

最准确的定位是：当前项目是“可运行的 Coding Agent 教学 Lab”，不是“生产级 AI IDE”。
