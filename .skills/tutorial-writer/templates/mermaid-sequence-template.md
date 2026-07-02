# Mermaid 时序图模板

```mermaid
sequenceDiagram
    participant U as 用户
    participant W as Web UI
    participant S as Server
    participant A as Agent Runtime
    participant T as Tool System
    participant WS as Workspace

    U->>W: 提交编码任务
    W->>S: 创建 Agent Session
    S->>A: 启动 Agent Run
    A->>T: 调用工具
    T->>WS: 访问工作区
    WS-->>T: 返回结果
    T-->>A: Observation
    A-->>S: 生成事件
    S-->>W: 推送事件
    W-->>U: 展示结果
```

图后解释：

这张时序图展示了 Web AI Coding Agent 的一次交互。

重点说明：

1. Web UI 不直接执行工具；
2. Server 负责承接会话和事件；
3. Agent Runtime 负责推理和调度工具；
4. Workspace 层负责真实文件、命令、诊断等执行能力；
5. Observation 会回到 Agent，形成下一轮判断。
