# Coding Agent 的状态不能只活在内存里

一个可用的 Web Coding Agent 必须能回答：“刚才发生了什么？”

P3 让 ByteSibyl 的 session、run、task、patch、approval、command 和 memory 都进入 durable state。当前仍使用 JSON 文件，但它已经从“教学日志”升级为产品状态边界。

## 为什么先不引入数据库

数据库会带来 migration、锁、索引和部署复杂度。P3 的目标是先稳定数据模型和 API：

- session 可以列表读取；
- task 可以恢复；
- trace 可以分页；
- memory 有 scope。

等这些边界稳定后，再替换为 SQLite/Postgres 会更可靠。

## 用户能感受到什么

刷新网页后，最近 session 会被恢复，聊天记录也会从 task messages 重新出现。这是从 demo 到产品的关键一步：用户不应该因为刷新页面就丢掉任务上下文。

## 当前限制

JSON store 不是最终答案。它适合单用户 MVP，但不适合多人并发。P3 的意义是让状态模型先变清楚。
