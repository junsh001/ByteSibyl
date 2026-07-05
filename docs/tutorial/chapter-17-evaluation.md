# 第 17 章：Evaluation

本章实现一个最小 Evaluation 系统。它让我们从“感觉 Agent 好像有用”进入“用任务、命令和指标判断 Agent 是否有效”。

## 1. 定义 Eval Task

在 `packages/shared` 中加入 Eval contract：

- `EvalTask`
- `EvalTaskResult`
- `EvalReport`
- `EvalTaskListResponse`
- `EvalRunResponse`

任务格式如下：

```json
{
  "id": "ts-typecheck-001",
  "workspace": "examples/buggy-ts-project",
  "prompt": "Fix the TypeScript typecheck error.",
  "successCommands": ["npm run typecheck"],
  "forbiddenFiles": ["package.json"],
  "maxChangedFiles": 3
}
```

`prompt` 是任务目标，`successCommands` 是客观成功标准，`forbiddenFiles` 和 `maxChangedFiles` 是边界检查。

## 2. 新增 `packages/eval`

创建：

```text
packages/eval
├── package.json
├── tsconfig.json
└── src/index.ts
```

核心导出：

- `loadEvalTasks(tasksDir)`
- `parseEvalTask(value)`
- `runEvalTask(task, options)`
- `runEvalTasks(tasks, options)`

`runEvalTasks` 会返回完整 JSON report。

## 3. 检测 changed files

Runner 会在执行命令前后扫描 workspace，生成文件 hash 快照：

```ts
const before = await snapshotWorkspace(workspaceRoot);
// run commands
const after = await snapshotWorkspace(workspaceRoot);
const changedFiles = diffSnapshots(before, after);
```

然后检查：

- changed files 是否超过 `maxChangedFiles`。
- changed files 是否包含 `forbiddenFiles`。

## 4. 用 Shell Runner 执行命令

Eval 不直接执行任意 shell。它复用 `ShellRunner`：

```ts
const runner = new ShellRunner({ workspaceRoot });
const result = await runner.run({ command });
```

这意味着 Eval 命令仍然经过 safe command 白名单和 permission policy。

## 5. 增加任务文件

在 `examples/eval-tasks/` 下新增至少 5 个 JSON task：

```text
examples/eval-tasks/
├── guardrail-forbidden-files-001.json
├── node-version-smoke-001.json
├── ts-no-package-change-001.json
├── ts-repeatability-001.json
└── ts-typecheck-001.json
```

这些任务使用同一个示例 workspace，但检查不同的成功标准和 forbidden file 边界。

## 6. CLI 入口

保留根命令：

```bash
npm run eval
```

它会读取 `examples/eval-tasks`，批量运行并向 stdout 输出 JSON report。也可以写入文件：

```bash
npm run eval -- --report reports/eval/latest.json
```

## 7. Web 展示

Server 新增：

```text
GET /api/eval/tasks
POST /api/eval/run
```

Web 右侧新增 Evaluation 面板，显示：

- task 数量。
- pass 数。
- success rate。
- forbidden action count。
- 每个任务的简要结果。

## 8. 验证

运行：

```bash
npm run typecheck
npm run build
npm run eval
```

如果 workspace 当前仍有 TypeScript 错误，部分 Eval task 失败是正常的。关键是 runner 能批量运行、输出 JSON report，并能报告失败原因。

## 小结

Phase 17 建立了评测基础：任务、验证命令、边界检查和 JSON 指标。它还不是完整 Agent benchmark，但已经让项目从 demo 进入可度量阶段。
