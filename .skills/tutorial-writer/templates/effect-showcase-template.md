# 效果展示模板

> 用途：让读者看到本阶段代码运行后的实际结果。

## 效果展示类型

优先选择真实可验证效果。

### 1. Web UI 截图

```md
![Web UI 效果](./assets/phase-XX/web-ui.png)
```

说明：

- 页面展示了什么；
- 哪个组件或模块实现了它；
- 当前还不能做什么。

### 2. API 响应

```bash
curl http://localhost:3000/health
```

```json
{
  "ok": true
}
```

说明：

- 这个响应证明了什么；
- 后续阶段会如何扩展。

### 3. 终端验证结果

```bash
npm run typecheck && npm run build
```

```text
<真实输出摘要>
```

说明：

- 验证命令检查了什么；
- 为什么这个阶段要跑它。

### 4. Agent Trace

```text
[session.created] id=...
[tool.called] read_file
[tool.result] success=true
```

说明：

- Trace 中每一行代表什么；
- 这如何帮助调试 Agent。

### 5. Diff Preview

```diff
- old code
+ new code
```

说明：

- Diff 展示了什么；
- 为什么 Agent 修改代码前要先展示 Diff。

## 禁止

- 不要伪造命令输出；
- 不要伪造 UI 截图；
- 不要伪造测试通过；
- 如果无法生成效果，就写清楚当前阶段为什么没有。
