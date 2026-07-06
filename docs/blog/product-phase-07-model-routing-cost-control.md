# 让 Web Coding Agent 的模型调用可控：路由、预算与降级

真实模型接入以后，Coding Agent 很快会从“能跑”进入“能不能安心跑”的阶段。

如果一个用户点击发送，只看到：

```text
model openai_compatible/deepseek-chat failed 10563ms
```

这对产品是不够的。用户不知道它为什么失败、不知道是否会继续消耗、不知道有没有 fallback，也不知道
这一次任务大概花了多少 token。

P7 做的事情就是把模型调用从一个黑盒请求，变成一个可观察、可控制的运行时模块。

## 为什么要 Model Router

Coding Agent 不是只有一种模型调用：

- 轻量检查适合便宜模型。
- 主要编码适合默认模型。
- 复杂规划可能需要 reasoning 模型。
- review 阶段最好不要复用 coder 的完整上下文。

P7 先定义 cheap/default/reasoning/reviewer 四类 route。当前四类 route 仍指向同一个 provider，
但 contract 已经稳定下来。这样后续替换模型矩阵时，不需要重写 Agent Loop 或 Web UI。

## 为什么预算必须是 per-run

产品里的预算不应该只是一个全局计数器。用户关心的是“我这一次发送消息用了多少”。所以 P7 在每次
Agent Run 开始前重置 usage，然后把每次模型调用的 token 和估算成本累加到本次 run。

预算超限后，Agent 会以 `budget_exceeded` 停止，并把原因写进聊天流和任务记录。

## fallback 的产品价值

开发者配置真实 provider 时，常见失败包括：

- API key 缺失。
- endpoint 配错。
- provider 超时。
- 网络或兼容性问题。

如果每次失败都让整个产品不可用，调试体验会很差。P7 的策略是：真实 provider 失败时，可以降级到
mock provider，让 Web IDE、工具调用、Patch 流程继续可演示。

fallback 不是隐藏失败。聊天记录会明确显示 `fallback=mock`，审计记录也会保留这个状态。

## 前端变化

右侧 AI Chat 现在新增模型控制信息：

- 选择 route。
- 查看本次 token/cost 使用量。
- 查看 fallback 策略。

模型调用消息会展示 route、provider/model、状态、耗时、估算成本和 fallback 状态。用户不需要打开
Trace 才知道模型层发生了什么。

## 仍然保守的地方

P7 没有做团队额度、真实账单、复杂模型矩阵，也没有做 secret redaction manifest。这些都很重要，
但它们属于更后面的工程化阶段。

这一阶段先把最关键的产品边界打稳：模型可路由，预算可见，失败可降级，审计可追踪。
