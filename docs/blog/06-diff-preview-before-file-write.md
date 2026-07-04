# 在写文件之前，先让 Agent 学会展示 Diff

Coding Agent 最危险的时刻，不是它读文件，也不是它调用搜索工具，而是它开始改文件。

如果系统直接把模型生成的内容写进 workspace，用户只能在事后发现问题。更糟的是，Agent 自己也
很难解释“我到底改了什么”。所以在实现文件写入之前，应该先实现 Patch Proposal 和 Diff Preview。

## Patch Proposal 是一个承诺

Patch Proposal 不是最终修改。它只是系统提出的一份变更建议：

- 目标文件是什么？
- 删除了哪些行？
- 新增了哪些行？
- 这份建议属于哪个 Session？
- 用户是否已经丢弃它？

有了 proposal，Agent 的“想改代码”就不再是一段模糊文本，而是一份可检查的数据结构。

## Diff Preview 是 Human-in-the-loop 的入口

很多人会把 approval 理解成一个按钮：同意或拒绝。但真正有价值的 approval 前提是，用户能看清
自己在批准什么。

Diff Preview 就是这个前提。它把修改拆成上下文、删除、添加，让用户能快速判断：

- 修改是否发生在预期文件？
- 改动范围是否过大？
- 是否删除了不该删的内容？
- 是否只是修 bug，还是顺手重构了其他东西？

没有 Diff Preview 的 approval 只是形式上的确认。

## 不要急着 apply

Phase 6 刻意不写文件。这个限制很重要：它迫使我们先把 patch 数据模型、diff 生成、session
history 和 Web 展示做清楚。

等这些基础稳定后，再进入 approval、guardrails 和 apply，会更容易解释系统行为，也更容易定位
错误。

## Patch Engine 不必一开始就复杂

第一版 Patch Engine 可以很小：输入原始内容和修改后的内容，输出 line-based diff。它不需要覆盖
所有 git diff 细节，也不需要处理二进制文件、大型 rename 或复杂冲突。

学习型项目的重点是边界：

- Patch Engine 负责生成 diff。
- Server 负责读取 workspace 和保存 proposal。
- Web 负责展示 diff。
- 后续 permission 层负责决定能不能 apply。

当这些职责清楚后，Agent 的文件修改能力才不会变成一个黑盒。

先展示 diff，再谈写文件。这是 Coding Agent 从 demo 走向可控系统的关键一步。
