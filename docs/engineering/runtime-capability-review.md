# Runtime 能力现状与改进方向

本文总结长短期记忆管理、工具管理、上下文管理和 skill 加载的完成情况。

## 总览

| 能力 | 当前状态 | 可教学程度 | 产品化程度 |
|---|---|---:|---:|
| 短期记忆 | 当前 run 的 messages、tool observations、context summary | 高 | 中 |
| 长期记忆 | session log JSON 持久化，但未参与检索和决策 | 中 | 低 |
| 工具管理 | ToolRegistry + schema validation + permission class + hooks | 高 | 中 |
| 上下文管理 | Repo map、diagnostics、relevant files、budget、observation compression | 高 | 中 |
| Skill 加载 | 本地 `.skills` 扫描、frontmatter、trigger scoring、事件记录 | 高 | 中低 |

## 短期记忆

当前短期记忆主要存在于一次 Agent Run 内：

- `packages/agent-core` 维护 `ModelMessage[]`。
- 工具结果以 tool message 形式回到模型。
- `packages/context-engine` 会压缩最近 observation。
- `agent.context_summary` 记录每次模型调用前的上下文摘要。

优点：

- 易理解。
- 每次 run 的上下文可见。
- 不会把整个仓库盲目塞入 prompt。

不足：

- 多轮 chat 的历史没有形成明确的 conversation memory 策略。
- 长任务恢复时，只依赖 session log，没有自动重建高质量工作记忆。
- 缺少“事实记忆”和“临时观察”的区分。

改进方向：

1. 明确 memory 分层：conversation、run、workspace、project、user preference。
2. 为每次 run 保存 structured memory summary，而不是只存事件。
3. 恢复任务时由 Trace 和 summary 重建 working memory。

## 长期记忆

当前长期记忆是“可持久化记录”，不是“可检索记忆”：

- `packages/telemetry` 写入 sessions、runs、patches、approvals、commands、repairs、modelCalls、hooks。
- Trace Replay 可导出 session timeline。

优点：

- 可审计。
- 可复盘。
- 支持 Eval 结果记录。

不足：

- JSON 文件不适合并发、多用户和大数据量。
- 没有 embedding / vector search。
- 没有项目级知识库、用户偏好或跨 session recall。

改进方向：

1. 把 `SessionStore` 迁移到 SQLite/Postgres。
2. 增加 memory table：`session_summaries`、`workspace_facts`、`user_preferences`、`decision_records`。
3. 引入检索层，但必须受权限和 workspace 边界约束。

## 工具管理

当前工具系统已经具备教学级完整闭环：

- `ToolRegistry` 注册工具。
- 每个工具有 schema、description、permission。
- `ToolRunner` 校验输入。
- Hooks 可在 before/after tool call 拦截和记录。
- Shell、Patch、Workspace、Diagnostics、Todo 等能力分包实现。

不足：

- schema validator 是教学用最小实现，不等同完整 JSON Schema。
- 工具没有版本、owner、来源和启用策略。
- 工具权限是静态字段，尚未根据用户、workspace、phase、sandbox 动态计算。
- MCP 尚未接入。

改进方向：

1. 引入更完整的 schema validator。
2. 工具 manifest 化，记录 version、capability、risk、required approval。
3. 支持 per-workspace tool policy。
4. MCP server 作为外部工具源接入，但先经过 permission 和 audit。

## 上下文管理

当前 Context Engine 完成了最小上下文工程：

- 从 workspace tree 生成 repo map。
- 合并 TypeScript diagnostics。
- 根据任务、诊断、观察选择 relevant files。
- 控制 context budget。
- 压缩旧 observation。

不足：

- 不读取相关文件内容，只输出 selection summary。
- 没有 symbol index、AST、git diff、recent edits。
- 没有 token 级估算。
- 没有多模型 context 分配。

改进方向：

1. 增加 file snippet selection。
2. 接入 git diff、最近修改、失败命令、LSP symbol。
3. 对不同模型维护不同 context budget。
4. 为大仓库引入索引和增量更新。

## Skill 加载

当前 SkillRegistry 已实现：

- 从 `.skills` 读取 `SKILL.md`。
- 解析 frontmatter。
- 根据 triggers 和 task token 打分。
- 选择一个 skill。
- 发出 `agent.skill_selected` 事件。

不足：

- 只支持本地目录。
- 只选择一个 skill。
- 不支持 skill 依赖、版本、禁用、权限声明。
- 不读取 skill 引用的额外资源。
- 不区分“项目 skill”和“用户全局 skill”。

改进方向：

1. 支持多 skill 组合，但要限制冲突。
2. 给 skill 增加 manifest：permissions、tools、hooks、resource roots。
3. 增加 skill audit：每次选择原因、注入内容摘要、版本 hash。
4. 后续与插件系统、MCP 权限模型统一。
