# Product Phase 05 设计说明：Product Agent Task Loop

P5 不重写 Agent Core，而是在 Server 层把现有 Agent Run 包装为 Product Task。这样可以获得可恢复任务状态和聊天记录，同时保持 agent-core 与 Web UI 解耦。

## ProductTask

Task 包含：

- status：created、planning、running、waiting_approval、completed、failed、cancelled、blocked。
- stopReason：done、approval_required、budget_exceeded、sandbox_failed 等。
- messages：user、assistant、status、tool、command、approval、error。
- conversationSummary、taskSummary、latestDecision。

## 状态流

```text
user sends message
  -> create/reuse ProductTask
  -> create AgentRun
  -> task running
  -> record model/tool/status messages
  -> done/error/cancelled updates stopReason
```

## Web Chat

右侧栏只保留聊天主流程。工具调用、模型调用、命令执行、审批状态都进入消息气泡。Diff Review 改为默认折叠。

## 边界

P5 是可恢复任务状态，不是后台任务队列。刷新后能恢复记录，但不能恢复已经中断的进程继续运行。
