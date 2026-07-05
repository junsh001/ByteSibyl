# 为什么 Coding Agent 需要 Session State

一个能调用工具的 Agent Loop 看起来已经很像“智能体”了：模型提出工具调用，工具返回
observation，模型继续推理，最后给出回答。但只要把它放到真实产品里，就会马上遇到一个问题：
这次运行到底发生了什么？

如果运行过程只存在于浏览器内存中，用户刷新页面后就看不到历史。请求中断时，系统也不知道是
完成、失败还是取消。更麻烦的是，后续如果要加入 approval、patch、shell command 或 diagnostics，
每一步都需要明确归属和状态。

这就是 Session State 的价值。

## Session 和 Run 不是一回事

Session 是用户的一段工作上下文。它可能包含多次尝试、多次提问和多次 Agent Loop。

Run 是其中一次具体执行。一次 run 会经历 created、running、completed、failed 或 cancelled。
把 Session 和 Run 分开后，系统就能回答几个关键问题：

- 这个任务属于哪个工作上下文？
- 当前有没有正在运行的任务？
- 上一次运行是正常结束，还是被取消？
- 每一步工具调用和模型输出能否回看？

## 长任务必须可以控制

Coding Agent 天然会变成长任务。它可能要读文件、搜索、等待模型、运行验证命令，未来还会等待
用户审批。如果没有取消能力，用户只能关闭页面或重启服务。

Phase 5 使用协作式取消：Server 为活跃 run 保存 `AbortController`，Web 请求取消后，Agent Loop
在安全边界处停止。这种方式不会假装能强杀所有事情，但它建立了正确的控制入口。

## 日志不是装饰

很多 Agent Demo 会把日志当成 UI 装饰：流式打印几行文字，结束后就丢掉。真正有用的日志应该是
系统状态的一部分。

Phase 5 把每个事件保存为 run events，并额外生成教学视角的 step log：

- model_call
- tool_call
- tool_result
- final
- error

这样做的好处是，前端可以实时显示事件，教程可以讲清楚步骤，后续完整 Trace 和 Evaluation 也有基础
数据来源。

## 不要太早上复杂系统

Session State 不一定一开始就需要数据库、队列、分布式 worker 或完整 replay。学习型项目更适合
从一个 JSON 文件开始：状态结构透明，失败模式简单，代码容易读。

等到系统真的需要多用户隔离、并发队列和完整追踪，再把存储层替换掉也不迟。关键是先把状态边界
设计对：Agent Core 负责循环，Server 负责 lifecycle，Shared 负责契约，Telemetry 负责记录。

没有 Session State，Agent 只是一次请求。有了 Session State，它才开始像一个可操作、可诊断的
系统。
