# 图片资源模板

> 用途：规范博客图片、图示、截图和生成图的保存方式。

## 目录

所有博客图片资源放到：

```text
docs/blog/assets/phase-XX/
```

示例：

```text
docs/blog/assets/phase-04-agent-loop/
├── concept-agent-loop.svg
├── sequence-tool-call.svg
├── effect-agent-trace.png
└── validation-output.png
```

## 命名规则

使用语义化名称：

- `concept-*.svg`
- `architecture-*.svg`
- `sequence-*.svg`
- `state-*.svg`
- `effect-*.png`
- `screenshot-*.png`
- `cover-*.png`

## Markdown 引用

```md
![Agent Loop 概念图](./assets/phase-04-agent-loop/concept-agent-loop.svg)
```

图片后必须解释：

```md
这张图展示了 <内容>。读者需要重点关注 <重点>。
```

## 截图规则

截图必须来自真实运行效果。

不要伪造截图。

如果暂时没有截图，写：

```md
> 截图 TODO：运行 Phase XX 的 Web 页面后，补充 `<图片路径>`。
```

## AI 生成图规则

AI 生成图只适合：

- 封面；
- banner；
- 抽象概念插画；
- 氛围图。

不适合：

- 精确架构；
- 代码流程；
- 状态机；
- API 时序；
- 具体 UI 截图。

精确内容优先使用 Mermaid 或 SVG。
