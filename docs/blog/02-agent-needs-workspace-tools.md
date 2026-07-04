# Agent 为什么需要 Workspace 工具

## 问题背景

让模型写代码很容易，让模型在一个真实项目里可靠地改代码很难。区别在于：真实项目不是一段
prompt，而是一组文件、目录、约定和错误上下文。

如果 Agent 看不到 workspace，它只能根据用户描述猜测。猜测可以生成看似合理的代码，但很难
稳定修复真实问题。

## 常见误区

第一个误区，是把用户粘贴的代码当作完整上下文。用户通常只会给局部片段，而 bug 往往来自
类型定义、配置、调用方或测试。

第二个误区，是让模型一次性读取整个仓库。小项目里可以，大项目里会浪费上下文窗口，还会把
大量无关信息塞给模型。

第三个误区，是只做文件读取，不做路径边界。只要系统能读取文件，就必须确保读取范围不会逃出
workspace。

## 核心设计思想

Phase 2 把 workspace 能力拆成三个只读动作：

```text
文件树：知道项目有什么
读文件：看到具体代码
搜索文本：快速定位相关位置
```

这三个动作还不是 Agent tool。它们先作为 Server 和 Web 的确定性能力存在。等 Phase 3
Tool System 出现后，再把它们注册成结构化工具。

## 最小实现

本阶段新增 `packages/workspace`，提供 `WorkspaceService`：

- `tree()` 构建文件树。
- `readTextFile(path)` 读取文本文件。
- `searchText(query)` 搜索文本。

Server 暴露 `/api/workspace/*` 路由，Web 将左侧文件树和中间 editor 区接到真实数据。

## 运行效果

用户打开页面后，左侧显示 `examples/buggy-ts-project`。点击 `README.md` 或
`src/index.ts`，中间区域会显示文件内容。搜索 `formatUser` 会返回匹配文件、行号、列号和
代码片段。

这说明 Web 不再只是一个壳子，而是已经能展示真实项目上下文。

## 工程取舍

本阶段没有做写文件。虽然写文件很重要，但它需要 patch、diff preview 和 approval，否则很
容易变成静默覆盖。

本阶段也没有做索引。简单文本搜索足够支撑教学闭环，复杂 repo map 会留到 Context Engine
阶段处理。

## 总结

Workspace 工具是 Coding Agent 的眼睛。没有它，Agent 只能猜；有了它，后续 Tool System
和 Agent Loop 才能建立在真实代码观察之上。
