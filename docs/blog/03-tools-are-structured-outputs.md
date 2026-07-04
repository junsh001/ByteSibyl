# Tool System：工具不是普通函数，而是结构化动作

## 问题背景

Coding Agent 要做事，最终一定要调用工具：读文件、搜索、运行测试、提出 patch。很多 demo
会直接让模型输出一段自然语言，比如“我需要读取 src/index.ts”，然后系统再猜它想做什么。

这种方式不稳定。真正可靠的 Agent 需要结构化工具调用。

## 常见误区

第一个误区，是把工具当成普通后端函数。普通函数只关心业务调用，Agent 工具还需要描述、
schema、权限和标准结果。

第二个误区，是相信模型会永远给对参数。模型可能漏字段、拼错字段、传错类型。系统必须校验
input，而不是让错误进入底层文件系统。

第三个误区，是过早接模型。没有 Tool System 时接模型，只会把不稳定性藏在 prompt 里。

## 核心设计思想

工具应该是一份结构化合约：

```text
name         工具名
description  给模型和开发者看的能力说明
schema       输入格式
permission   权限等级
run          确定性执行逻辑
```

模型未来只负责提出工具调用，系统负责校验和执行。

## 最小实现

Phase 3 新增 `packages/tool-system`：

- `ToolRegistry` 注册工具。
- `ToolRunner` 执行工具。
- 最小 schema 校验拒绝错误参数。
- `ToolResult` 统一表达成功和失败。

本阶段注册三个只读工具：

- `get_workspace_tree`
- `read_file`
- `search_text`

## 运行效果

Web 右侧会显示当前注册的工具。选择一个文件后，可以点击按钮用 `read_file` 工具读取当前文件。
底层返回的是标准 `ToolResult`，而不是随意的 HTTP JSON。

这说明系统已经拥有“结构化动作层”。Phase 4 的 Agent Loop 可以直接复用这一层。

## 工程取舍

本阶段没有引入 Ajv 或 Zod，而是实现一个最小 JSON schema 子集。原因是 Phase 3 只需要验证
workspace 工具的简单输入，过早引入完整 schema 库会让教学重点偏移。

本阶段也没有实现 permission enforcement。工具已经标注 permission，但真正的 approval 和
guardrails 会在 Phase 7 实现。

## 总结

Tool System 是 Agent 从“会说”走向“能做”的边界层。工具不是普通函数，而是可描述、可校验、
可追踪、可授权的结构化动作。没有这一层，Agent Loop 很容易退化成一堆脆弱的 prompt 约定。
