# Shell Runner 不是终端

给 Coding Agent 加命令执行能力时，很容易走向“做一个 Web Terminal”。这听起来直接，但对 Agent
系统来说太危险，也太难教学。

Shell Runner 的目标不是模拟终端，而是提供可控、可记录、可判断结果的命令执行边界。

## 不要把字符串交给 shell

如果把用户或模型生成的字符串直接交给 shell，系统就必须面对 pipe、redirect、环境变量、command
substitution、后台进程等复杂行为。

Phase 8 选择更窄的方式：先把命令解析成 argv，然后调用 `spawn(file, args)`，并设置 `shell: false`。

这样 `npm run typecheck` 是一个明确的进程调用，而不是一段任意 shell 脚本。

## 安全命令应该是白名单

第一版 Shell Runner 不需要支持所有命令。它只需要支持学习流程中必要的安全命令，例如：

- `npm run typecheck`
- `node --version`
- `npm --version`

未知命令、risky command 和带 shell operator 的命令直接阻断。这个限制让系统行为更容易解释。

## 输出也是状态

命令结果不只是 terminal text。它应该被结构化记录：

- status
- exit code
- signal
- stdout
- stderr
- timeout
- duration
- permission decision

这些字段会成为后续 self-repair loop 的输入。Agent 不是“看屏幕”，而是消费结构化 command result。

## 为什么暂时不做命令审批

Patch approval 和 command approval 很像，但风险不同。命令会启动进程，可能产生副作用，也可能长时间
运行。Phase 8 先只允许 safe command，risky command 直接拒绝。

等 Shell Runner 的超时、输出捕获和分类稳定后，再扩展命令审批会更稳。

## 为 Phase 9 铺路

Phase 9 会把 typecheck failure、patch proposal、approval 和再次验证串起来。Shell Runner 是这个闭环
的验证层。

一个好的 Shell Runner 不应该像终端一样自由，而应该像 Agent Runtime 的一个受控工具：输入清楚、
输出结构化、边界可审计。
