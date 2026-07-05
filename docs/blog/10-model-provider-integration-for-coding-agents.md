# 接入真实模型，不等于放开系统边界

很多 coding agent 项目一开始就接大模型 API。这样很快能看到“智能”效果，但也容易把几个问题混在一起：模型输出不稳定、工具调用不规范、权限边界不清、错误状态不可观察。

更稳妥的顺序，是先用 mock provider 跑通 Agent Loop，再接真实模型。这样我们能清楚地区分：循环机制是否正确，工具 schema 是否可控，Patch 和 Shell 是否仍在 guardrails 之内。

Phase 10 做的就是这件事。系统默认仍使用 mock provider；当 Server 配置 API key、base URL、model name 和 timeout 后，才切换到 OpenAI-compatible provider。Web 只显示 provider 状态，不接触 API key。

真实模型能做什么？它可以返回文本，也可以返回结构化 tool call。它不能直接读文件，不能直接写文件，不能直接执行命令。读文件仍要经过 Tool System；写文件仍要变成 Patch Proposal；应用 Patch 仍要审批；命令仍要走 Shell Runner。

这就是模型接入的关键边界：模型负责提出下一步意图，系统负责决定这个意图能不能执行。

同时，每次 model call 都会记录 provider、model、latency、usage、错误状态和简短摘要。这样调试时可以区分：是模型没有返回 tool call，是 API 超时，还是工具执行失败。

接入真实模型不是终点。Context Engine、LSP Diagnostics、Trace 和 Eval 还没有完成。但从这一阶段开始，后续能力终于可以服务真实模型决策，而不是只围绕 mock 流程演示。
