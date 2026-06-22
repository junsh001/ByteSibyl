# CodeForge · AI Coding 学习场

> 随时随地的 **AI 结对编程**，同时通过闯关小游戏，亲手学会 **Skills / MCP / Agent**，搭出一个属于自己的 AI agent。
> A web AI coding agent **and** a hands-on game that teaches modern LLM concepts — powered by DeepSeek.

CodeForge 是两件事的合体：

1. **一个真正能干活的 AI 编程 agent** —— 浏览器里描述需求，AI 自主读文件、写代码、跑命令、看结果、修 bug，直到任务完成（标准 agentic loop + function calling，参考 OpenHands / Cline / SWE-agent 的最佳实践）。
2. **一个 5 关闯关教程** —— 从「一句提示词」一路通到「一个会自己调工具的 agent」，每关都在内置编辑器里真实写代码，由 AI 即时批改、解锁、给 XP。

---

## ✨ 功能 Features

- **流式 agentic 编程**：SSE 实时流式输出思考、工具调用（`read_file` / `write_file` / `edit_file` / `search` / `run`）、文件改动 diff、运行结果。
- **内置编辑器 + 终端**：Monaco 代码编辑器、xterm 真实终端、文件树，改完一键运行。
- **沙箱执行**：后端受限子进程沙箱（超时、输出上限、环境变量清洗、危险命令拦截、进程组级 kill），支持 **JS 与 Python**。
- **教程闯关游戏**：Prompt → Tool Use → Skills → MCP → Agent，中英双语，AI 评分 + 进度/XP 持久化。
- **Ask / Agent 双模式 + 深度思考**：`ask` 只读不改；`agent` 全自动；可切换 `deepseek-reasoner` 深度推理。
- **中英双语 UI**，简洁暗色 IDE 风格。
- **内置评测**：一条命令对自己跑一个 Aider-Polyglot 风格的多语言基准，量化 agent 能力（见下）。

## 🧱 架构 Architecture

Node monorepo（npm workspaces，全 TypeScript）：

```
webAiCoding/
├─ apps/web         React + Vite + Tailwind + Monaco + xterm（简洁 IDE 前端）
├─ apps/server      Fastify + SSE（agent 接口、沙箱、课程批改、静态托管）
├─ packages/agent   agent 核心：DeepSeek 流式客户端、工具、agentic loop、diff、workspace
├─ packages/db      better-sqlite3 仓储层（接口化，可切 Postgres）
├─ packages/shared  前后端共享的协议类型（SSE 事件、工具 schema、课程模型）
├─ scripts/         冒烟测试 + 评测 harness
└─ Dockerfile / docker-compose.yml
```

数据流：浏览器 → `POST /api/projects/:id/agent` → 服务端 `runAgent()` 驱动 DeepSeek function-calling 循环 → 工具在沙箱里执行 → 事件以 SSE 流式回传 → 前端实时渲染。

## 🚀 快速开始 Quickstart（开发模式）

前置：**Node ≥ 20**，一个 **DeepSeek API Key**，以及（可选）`python3` 用于跑 Python。

```bash
# 1) 安装依赖
npm install

# 2) 配置 key（服务端读取 deepseek_KEY，也兼容 DEEPSEEK_API_KEY）
cp .env.example .env
#   编辑 .env，填入 deepseek_KEY=sk-xxxx

# 3) 连通性自检
npm run smoke

# 4) 同时启动前后端（web :5173，server :8787，已配置代理）
npm run dev
```

打开 http://localhost:5173 即可。

## 📦 生产部署 Deploy

**方式 A — 纯 Node（无需 Docker）**
```bash
npm install
npm run build      # 构建前端 SPA 到 apps/web/dist
deepseek_KEY=sk-xxx npm run start   # 服务端在 :8787 同时托管 SPA 和 API
```

**方式 B — Docker / Compose**
```bash
echo "deepseek_KEY=sk-xxx" > .env
docker compose up -d --build
# 访问 http://<host>:8787 ；数据持久化在命名卷 codeforge-data
```
镜像内含 `python3` + `bash`，容器化后沙箱隔离性更好。

## 📊 评测与定位 Benchmarking

我们用一个**内置的多语言 pass@1 基准**（Aider-Polyglot 风格：按规格写代码，再用隐藏测试验证）量化 agent 能力：

```bash
npm run eval
```

它会让 agent 实际解 N 道 JS/Python 题、在沙箱里运行验证，并打印 `pass@1` 分数。

**为什么用这套指标？** 2026 年最具影响力的 AI 编程榜单是 **SWE-bench (Verified/Pro)**、**Aider Polyglot**、**Terminal-Bench**。其中 Aider Polyglot 轻量、跨 6 种语言、DeepSeek 有公开基线，最适合小团队自评。

**参考水位（"前 10 / 较优档"）：** Aider Polyglot ≥ **80%**，SWE-bench Verified ≥ **65–70%**。
DeepSeek-V3.2 公开成绩 ≈ Aider 74% / SWE-bench Verified 68% / LiveCodeBench 90%——本身就在较优档，且推理成本约为前沿模型的 ~1%。**我们的定位：前 10 档能力，~1% 的成本。**

## 🎮 教程闯关 The Learning Track

| 关卡 | 概念 | 你会做出 |
|---|---|---|
| 1 | Prompt | 一段 system prompt |
| 2 | Tool Use | 一个 function-calling 工具 schema |
| 3 | Skills | 一个 `SKILL.md` 能力包 |
| 4 | MCP | 一份 MCP server 配置 |
| 5 | Agent | 一个最小可运行的 agent 主循环（毕业项目）|

每关在右侧编辑器真实写代码，点「检查我的作业」由 AI 按 rubric 批改，通过即解锁下一关并获得 XP。

## 🔒 安全说明 Security

- 沙箱为**受限子进程**（非完整容器隔离）：超时 / 输出上限 / 环境变量清洗（绝不泄漏 API Key 给用户代码）/ 危险命令模式拦截 / 进程组 kill。
- 文件操作严格限制在项目工作区内，拒绝 `..` 越权与绝对路径逃逸。
- 当前为**单用户、免登录**设计，适合个人自用或可信网络。对外公开部署前，建议加上认证与更强的容器/虚拟机级沙箱隔离。

## ⚙️ 关键环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `deepseek_KEY` | — | DeepSeek API Key（必填；兼容 `DEEPSEEK_API_KEY`）|
| `DEEPSEEK_MODEL` | `deepseek-chat` | 主模型 |
| `DEEPSEEK_REASONER_MODEL` | `deepseek-reasoner` | 深度思考模型 |
| `PORT` | `8787` | 服务端口 |
| `DATABASE_URL` | `./data/app.db` | SQLite 路径 |
| `WORKSPACE_ROOT` | `./workspaces` | 用户项目根目录 |
| `SANDBOX_TIMEOUT_MS` | `20000` | 单条命令超时 |

---

构建于 DeepSeek · 灵感来自 OpenHands / Cline / bolt.new / Aider。
