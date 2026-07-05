# Product Phase 04 教程：给命令执行加上 SandboxProvider 边界

P4 的目标是让 Shell Runner 从直接执行命令，变成通过 SandboxProvider 执行命令。

## 1. 定义 Provider

`packages/shell-runner` 中新增：

```ts
interface SandboxProvider {
  kind: 'local' | 'docker';
  run(input: SandboxRunInput): Promise<ShellCommandResult>;
}
```

## 2. Local fallback

当前实现使用 local fallback。它不是强隔离，但会记录 policy，并继续执行已有安全策略：

- 命令白名单。
- 超时。
- 输出截断。
- 禁止 shell 操作符。
- 不注入 secrets。

## 3. 文件变化快照

命令执行前后通过 `git status --porcelain` 获取 changed files，并通过 `git diff --stat` 记录摘要。

## 4. Web 展示

命令结果进入聊天框的 command bubble。详细 sandbox metadata 留在日志和 session store。

## 验证

运行：

```bash
npm run typecheck
npm run build
npm --workspace @wac/server run build
```

## 边界

本阶段不自动安装 Docker，不运行任意危险命令，不把 local fallback 描述成强沙箱。
