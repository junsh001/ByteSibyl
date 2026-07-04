# 为什么 Web AI Coding Agent 要先搭一个 IDE 壳

## 问题背景

很多人做 Coding Agent，会从聊天框开始：用户输入需求，模型返回答案。这个入口很快，
但它会隐藏一个问题：Coding Agent 真正工作时，不只需要对话，还需要操作一个项目。

它要看文件、定位错误、生成修改、展示 diff、等待审批、运行验证、记录日志，并在后续阶段扩展完整 Trace。只靠一块
聊天区域，很难承载这些信息。

## 常见误区

第一个误区，是把 Web 页面当成普通 Chat UI。Coding Agent 的输出不是一段文本，而是一组
行动和证据。

第二个误区，是过早接入模型。没有清晰的界面区域和事件协议时，模型输出只会堆在聊天里，
后续很难解释工具调用、日志和 diff。

第三个误区，是把 Server 当成模型代理。Server 更重要的职责是管理 session、workspace、
事件流和审批边界。

## 核心设计思想

Phase 1 先搭一个 Web IDE 壳：

```text
Workspace | Editor | Agent Chat + Todo
Terminal / Command Log / Trace Log
Diff Preview + Approval
```

这个壳不是装饰。它提前定义了后续能力的落点：文件系统进 Workspace，代码内容进
Editor，计划进 Todo，命令和日志进底部面板，修改进入 Diff Preview。

## 最小实现

本阶段只实现四件事：

- Web 五区布局。
- `GET /api/health`。
- `POST /api/sessions`。
- `GET /api/sessions/:id/events`。

没有文件读写，没有 shell，没有模型调用，也没有 patch。这些缺席是刻意的，因为每个能力都
应该在自己的阶段被讲清楚。

## 运行效果

用户打开页面后，可以看到完整 IDE 壳子。点击“创建 Agent Session”后，Web 调用 Server
创建 session，并连接 SSE 事件流。底部日志会显示 session 创建和连接事件。

这说明 Web 与 Server 的最小交互已经成立，后续可以把真实 agent 行为逐步接入。

## 工程取舍

Session 暂时存在内存里，而不是数据库里。这不是最终设计，但符合 Phase 1 的目标。持久化
状态会在 Session State 阶段处理。

Web 里也没有真正加载 Monaco 文件内容。现在只需要稳定布局和交互边界，真实 workspace
属于 Phase 2。

## 总结

Web AI Coding Agent 先需要一个能承载行动的界面，而不是一个更复杂的聊天框。Phase 1
用最小代码建立 Web、Server 和共享协议的边界，为后续 workspace、tool system 和 agent
loop 留出清晰位置。
