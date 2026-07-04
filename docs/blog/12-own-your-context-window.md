# Own Your Context Window：Coding Agent 不能把仓库一股脑塞给模型

很多人做 Coding Agent 时，第一反应是“给模型更多上下文”。这句话只对了一半。模型确实需要上下文，但更重要的是：谁来决定上下文？

如果上下文完全由聊天历史自然增长，Agent 很快会变得不可控。旧工具结果、长日志、无关文件、重复解释都会挤占窗口，真正重要的错误和相关代码反而被稀释。

## Context 是系统职责，不是模型自觉

Coding Agent 不能指望模型自己记得哪些内容重要。系统应该在每次模型调用前主动整理上下文：

- 当前任务是什么。
- 当前错误在哪里。
- 哪些文件最相关。
- 最近工具 observation 说明了什么。
- 旧 observation 被压缩到什么程度。
- 本轮上下文用了多少预算。

这就是 Context Engine 的价值。

## 为什么 repo map 很重要

Agent 不一定需要读取整个仓库，但它需要知道仓库大概长什么样。Repo map 就像一张粗略地图：目录、文件、关键路径先进入模型视野，具体文件内容再由工具按需读取。

这比直接塞全部文件更稳，也更接近真实 coding agent 的工作方式。

## diagnostics 应该优先进入上下文

Phase 11 已经接入 TypeScript diagnostics。到了 Context Engine 阶段，这些 diagnostics 不应该只显示在 UI 里，还应该成为模型调用前的高优先级上下文。

因为 diagnostics 通常直接指向当前任务的失败原因：文件、行号、列号、错误消息。它比普通日志更值得优先保留。

## 压缩不是丢弃

旧 observation 不应该无限展开，但也不能完全遗忘。更合适的做法是压缩：保留最近几条摘要，记录更旧 observation 的数量。

这样模型知道历史存在，但不会被历史淹没。

## 先做确定性规则

这个阶段没有上 embedding，也没有做向量索引。原因很简单：教学项目应该先让规则可见。

确定性 Context Engine 的好处是容易解释：

- diagnostics 文件优先。
- 任务提到的文件优先。
- 最近 observation 提到的文件优先。
- repo map 匹配任务关键词的文件补充。

当这些基础边界稳定后，再加语义检索才有意义。

## 小结

Context window 是 Agent 的工作记忆，不是垃圾桶。一个可靠的 Coding Agent 必须自己拥有上下文构造权：知道放什么、压缩什么、丢掉什么，以及为什么。
