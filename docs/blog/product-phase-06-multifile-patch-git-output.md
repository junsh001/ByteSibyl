# 为什么 Coding Agent 需要多文件 Patch

一个真实代码任务通常不是“改一行”。修复 typecheck 可能要改类型定义、业务代码和测试；
新增功能可能同时影响组件、API、样式和文档。只有单文件 diff 的 Agent，很快会卡在
demo 阶段。

P6 把 ByteSibyl 的 Patch 流程推进到多文件。

## 核心概念：把变更作为一个整体审批

多文件 Patch 不是把多个单文件 Patch 排成队列。它应该是一个整体：

```mermaid
flowchart LR
  A[多个文件草稿] --> B[Multi-file Patch Proposal]
  B --> C[逐文件 Diff Review]
  C --> D[一次审批]
  D --> E[Apply 到 workspace]
  E --> F[Git diff 输出]
```

这样用户审批的是“一次任务的完整变更”，而不是被迫逐个猜每个文件是否相关。

## P6 如何实现

P6 保留原来的 `PatchProposal`，新增 `files[]`：

- `kind` 表示 create、modify、delete、rename。
- `unifiedDiff` 保存单文件 patch。
- `originalContentHash` 用于 apply 前冲突检测。
- proposal 顶层 `unifiedDiff` 是所有文件 patch 的拼接。

这让旧单文件能力继续可用，同时 Web 可以展示真正的多文件 review。

## 为什么要做 conflict 检测

如果 proposal 创建后，workspace 文件又被用户或工具改了，直接 apply 就可能覆盖掉
新变化。P6 在 apply 前重新读取文件并比对 hash，发现不一致就拒绝应用。

这不是完整 merge，但它建立了产品化的底线：不要静默覆盖用户工作。

## Web 上的变化

编辑器工具栏新增 `Review All`。用户可以同时打开多个文件、编辑草稿，然后生成一个
多文件 proposal。

Review tab 中增加：

- commit message 草稿；
- `.patch` 下载；
- 多文件列表；
- Monaco Diff 逐文件查看。

高级信息仍留在底部 tab，不抢占右侧 AI Chat。

## Git 输出的意义

Patch Review 是用户看到的计划变更，Git diff 是 workspace 中真实落地的变更。
P6 在 apply 后返回 `git diff --binary`，用于对齐两者。

这让用户可以回答一个关键问题：

> 我批准的变更，是否就是工作区现在真实存在的变更？

## 当前限制

P6 不自动 commit，不自动创建 GitHub PR，也不处理二进制文件的可视化 diff。

这些能力会留给后续产品阶段：P7 控制模型成本，P8 打磨 UX，P9 做安全审计，P12
把多文件 patch 纳入回归评测。
