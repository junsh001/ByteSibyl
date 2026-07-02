# tutorial-writer Skill 最终版

这是 Web AI Coding Agent 项目的最终版 `tutorial-writer` Skill。

它的目标不是让 Codex 写一份干巴巴的技术设计文档，而是让 Codex 写出**知识教学博客**：

- 先解释概念，再讲代码；
- 经常使用图示帮助读者理解；
- 结合当前阶段的真实代码路径和短代码片段；
- 展示阶段成果，例如 Web UI、API 响应、终端日志、Agent Trace、Diff Preview、验证结果；
- 明确说明当前阶段还没有实现什么。

安装方式：

把 `.skills/tutorial-writer/` 复制到你的项目根目录。

推荐调用：

```text
Use the tutorial-writer skill.

Task:
Write the knowledge-teaching blog and tutorial chapter for Phase <N>.

Read:
1. ROADMAP.md
2. docs/PRODUCT_SPEC.md
3. docs/ARCHITECTURE.md
4. docs/milestones/<phase-file>.md
5. Current phase implementation files
6. .skills/tutorial-writer/templates/knowledge-blog-template.md
7. .skills/tutorial-writer/templates/visual-explanation-template.md

Requirements:
1. 博客必须是知识教学文章，不是技术设计文档。
2. 需要用图示帮助读者理解核心概念。
3. 必须引用当前阶段真实代码路径和短代码片段。
4. 必须展示阶段效果：Web UI、API、日志、Trace、Diff 或验证输出。
5. 不允许伪造截图、命令输出或测试结果。
6. 必须说明当前阶段的局限性。
```
