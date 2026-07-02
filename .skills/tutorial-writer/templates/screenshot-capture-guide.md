# 截图与效果展示指南

## 什么时候需要截图

当阶段已经产生可视化效果时，博客应包含截图，例如：

- Web 首页布局；
- 文件树；
- Monaco Editor；
- Agent Chat；
- Task Plan；
- Diff Preview；
- Logs / Trace Panel；
- Terminal 输出；
- Validation 结果。

## 截图保存路径

```text
docs/blog/assets/phase-XX/
```

## 截图命名

```text
effect-web-shell.png
effect-file-tree.png
effect-agent-chat.png
effect-diff-preview.png
effect-trace-panel.png
effect-validation-output.png
```

## 截图说明模板

```md
![Web Shell 效果](./assets/phase-01/effect-web-shell.png)

这张截图展示了 Phase 1 的 Web Shell。当前页面只完成了基础布局：左侧文件树、中间编辑区、右侧 Agent Chat 和底部日志区域。它还不能真正读取文件或运行 Agent，这些能力会在后续阶段实现。
```

## 没有截图时怎么办

不要伪造。

可以写：

```md
> 当前阶段没有可截图的交互效果。这里先使用 Mermaid 图解释流程，待下一阶段完成页面后再补充截图。
```

## 终端输出截图

如果用终端输出，优先粘贴文本而不是截图，方便读者复制和搜索。

```bash
npm run typecheck
```

```text
<真实输出摘要>
```
