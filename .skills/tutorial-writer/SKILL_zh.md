# Tutorial Writer Skill 中文说明

## 作用

这个 Skill 用来辅助 Codex 为 Web AI Coding Agent 项目的每个阶段撰写**知识教学博客**和**教程章节**。

重点不是写技术设计文档，而是让读者理解：

1. 这一阶段学习什么 Agent 概念；
2. 为什么 Web AI Coding Agent 需要这个概念；
3. 当前阶段代码是如何实现这个概念的；
4. 运行之后能看到什么效果；
5. 当前阶段还有哪些局限。

## 默认语言

除非阶段文件或用户明确要求其他语言，否则博客和教程默认使用中文。

常见英文术语可以保留，例如：

- Agent Loop
- Tool System
- Context Engine
- Diff Preview
- LSP Diagnostics
- Guardrails
- Trace
- Human-in-the-loop

## 必须阅读的文件

写作前，Codex 应该先阅读：

1. `ROADMAP.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. 当前阶段的 `docs/milestones/phase-xx.md`
5. 当前阶段的代码实现文件
6. 当前阶段已有的设计文档
7. 已有博客和教程
8. `.skills/tutorial-writer/templates/` 下的模板

## 博客不是技术设计文档

不要把博客写成：

- 模块清单；
- API 说明书；
- 代码变更日志；
- 架构规格说明；
- 内部开发记录。

博客应该是给读者看的知识教学文章。

## 推荐文章结构

建议使用：

`.skills/tutorial-writer/templates/knowledge-blog-template.md`

必须包含：

1. 标题；
2. 开篇问题；
3. 核心概念；
4. 图示解释；
5. 当前阶段如何实现；
6. 代码走读；
7. 效果展示；
8. 设计取舍；
9. 当前局限；
10. 总结；
11. 下一章预告。

## 图示和图片规则

每篇知识教学博客都应该尽量使用图示帮助读者理解。

推荐优先级：

1. Mermaid 图：流程图、架构图、时序图、状态机；
2. SVG 图：更精致的教学插图；
3. 截图：Web UI、Diff Preview、Agent Trace、终端日志、API 响应、验证结果；
4. AI 生成图：只适合封面图、banner、抽象概念插图；
5. ASCII 图：只适合很小的行内说明。

图示不是装饰，而是用来解释知识点的。

每篇博客至少包含：

1. 一张概念图；
2. 一张流程图 / 架构图 / 时序图 / 状态机图；
3. 一个效果展示：截图、API 输出、终端输出、Diff、Trace 或验证结果。

如果当前阶段还没有真实截图：

- 不要伪造截图；
- 可以添加明确的截图 TODO；
- 优先使用 Mermaid 或 SVG 解释概念和流程。

## Mermaid 图使用场景

适合用 Mermaid 表达：

- Agent Loop；
- Tool Call 流程；
- Web UI → Server → Agent → Tool 的时序；
- Context 构建流程；
- Patch 提议与应用流程；
- 权限审批流程；
- 测试失败后的自修复循环；
- LSP Diagnostics 反馈循环；
- Planner/Todo 状态机；
- Skills/Hooks 生命周期；
- Trace/Replay 过程。

每张 Mermaid 图后面必须解释：

1. 流程从哪里开始；
2. 每个主要节点是什么意思；
3. 当前阶段代码位于哪一部分；
4. 哪些能力还没有实现。

## 图片资源规则

如果创建图片文件，放在：

`docs/blog/assets/phase-XX/`

命名要清楚，例如：

- `agent-loop-concept.svg`
- `web-runtime-workspace-architecture.svg`
- `tool-call-sequence.svg`
- `diff-preview-effect.png`
- `validation-output.png`

不要用 AI 生成图来表达精确架构。精确架构应该优先使用 Mermaid 或 SVG。

## 代码走读规则

博客必须引用当前阶段真实代码路径。

代码片段要短，围绕知识点，不要整文件粘贴。

每段代码后要解释：

1. 文件在哪里；
2. 它解决什么问题；
3. 它和本章概念有什么关系；
4. 哪些能力留到后续阶段。

## 效果展示规则

每篇阶段博客必须包含效果展示。

可选形式：

1. Web UI 截图；
2. API 响应；
3. 终端命令输出；
4. 验证结果；
5. Agent Trace；
6. Diff Preview；
7. 事件流；
8. LSP Diagnostics 示例。

不允许伪造输出。

如果当前阶段没有可展示效果，可以写：

```md
> 当前阶段还没有可截图的 UI 效果。这里先用 Mermaid 图展示交互过程，下一阶段接入真实页面后再补充截图。
```

## 教程章节规则

教程章节比博客更偏步骤化。

建议使用：

`.skills/tutorial-writer/templates/tutorial-chapter-template.md`

教程章节必须包含：

1. 学习目标；
2. 前置条件；
3. 本章要构建什么；
4. 概念解释；
5. 图示解释；
6. 实现步骤；
7. 代码走读；
8. 运行和验证；
9. 效果展示；
10. 常见错误；
11. 当前局限；
12. 下一章。

## 写作风格参考

写作风格可参考：

- DeepLearning.AI LangGraph：从底层解释 Agent Loop；
- LangChain Academy LangGraph：解释状态、长任务、人类介入；
- Hugging Face Agents Course：用学习者友好的方式解释工具和评测；
- OpenAI Agents SDK：强调 guardrails、approval、tracing、结构化工具；
- Claude Code / Claude Agent SDK：强调文件、命令、编辑、权限、hooks、skills；
- 12-Factor Agents：强调生产级边界、显式状态、人类控制和可靠流程。

不要复制这些网站的原文，只学习它们的教学方式。

## 最终检查

写完前必须使用：

`.skills/tutorial-writer/templates/phase-blog-checklist.md`

检查：

1. 是否是知识教学文章；
2. 是否讲清楚一个核心概念；
3. 是否有概念图；
4. 是否有流程图 / 时序图 / 架构图 / 状态机图；
5. 是否引用真实代码路径；
6. 是否有短代码片段；
7. 是否有阶段效果展示；
8. 是否没有伪造截图或命令输出；
9. 是否说明当前局限；
10. 是否连接下一阶段。

## 最终报告

Codex 完成后应报告：

1. 创建了哪些文件；
2. 修改了哪些文件；
3. 添加了哪些图示；
4. 添加了哪些图片资源；
5. 引用了哪些代码路径；
6. 包含了什么效果展示；
7. 写清了哪些局限；
8. 还需要补充哪些截图或资源。
