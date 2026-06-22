import type { Lesson } from '@wac/shared';

/**
 * The learning track. Five lessons that progressively build the mental model
 * AND the actual code of a working agent: Prompt -> Tool Use -> Skills -> MCP
 * -> Agent. By the final lesson the learner has assembled a real mini-agent.
 */
export const LESSONS: Lesson[] = [
  {
    id: 'l1-prompt',
    order: 1,
    concept: 'prompt',
    title: { zh: '第一关：会说话的模型', en: 'Lesson 1: A Model That Talks' },
    summary: {
      zh: '理解 LLM 的输入输出、system/user/assistant 角色，以及为什么“提示词”是与模型沟通的接口。',
      en: 'Understand LLM I/O, the system/user/assistant roles, and why the prompt is your interface to the model.',
    },
    minutes: 8,
    xp: 100,
    body: {
      zh: `## 大语言模型只是一个函数

把一个 LLM 想象成函数：\`输出 = 模型(消息列表)\`。消息有三种角色：

- **system**：设定模型的人格、规则、目标（最高优先级）。
- **user**：你的请求。
- **assistant**：模型的回复（多轮对话时也会回填进去）。

下面是一次真实的 DeepSeek 调用：

\`\`\`json
{
  "model": "deepseek-chat",
  "messages": [
    {"role": "system", "content": "你是一个只用 JSON 回答的助手。"},
    {"role": "user", "content": "北京和上海哪个更靠北？"}
  ]
}
\`\`\`

**关键洞察**：模型没有记忆。每次请求你都要把完整的对话历史发回去——这就是为什么后面我们要自己管理 \`messages\` 数组。

> 动手：在右边编辑器里创建 \`prompt.md\`，写出一段 system prompt，把模型变成“严格的代码评审专家，只输出要点列表”。`,
      en: `## An LLM is just a function

Think of an LLM as \`output = model(messages)\`. Messages carry one of three roles:

- **system** — persona, rules, goals (highest priority).
- **user** — your request.
- **assistant** — the model's reply (also fed back in multi-turn chats).

A real DeepSeek call:

\`\`\`json
{
  "model": "deepseek-chat",
  "messages": [
    {"role": "system", "content": "You answer only in JSON."},
    {"role": "user", "content": "Which is further north, Beijing or Shanghai?"}
  ]
}
\`\`\`

**Key insight:** the model is stateless. You resend the whole history every call — which is why later we manage the \`messages\` array ourselves.

> Hands-on: create \`prompt.md\` in the editor and write a system prompt that turns the model into a "strict code reviewer that outputs only a bullet list".`,
    },
    tasks: [
      {
        id: 'l1-t1',
        instruction:
          'Create a file `prompt.md` containing a system prompt for a strict code reviewer. It must mention the role and that the output is a bullet list. / 创建 `prompt.md`，写一段“严格代码评审专家、只输出要点列表”的 system prompt。',
        hint: 'Include words like "code reviewer" / "评审" and "bullet" / "要点".',
        check: {
          kind: 'llm',
          rubric:
            'The file prompt.md should contain a system prompt that (a) defines a code reviewer persona and (b) constrains output to a bullet/list format. Pass if both are clearly present in any language.',
        },
      },
    ],
  },
  {
    id: 'l2-tool-use',
    order: 2,
    concept: 'tool-use',
    title: { zh: '第二关：让模型动手（Tool Use）', en: 'Lesson 2: Give the Model Hands (Tool Use)' },
    summary: {
      zh: '理解 function calling：模型不直接执行动作，而是输出“要调用哪个工具、用什么参数”，由你的代码去执行。',
      en: 'Understand function calling: the model emits which tool to call with what args; your code runs it.',
    },
    minutes: 12,
    xp: 150,
    body: {
      zh: `## 模型不会执行，只会“请求执行”

光会说话不够。**Tool Use（函数调用）** 让模型可以请求执行动作：读文件、查天气、跑代码。

流程是一个循环：

1. 你把**工具清单**（每个工具的名字、描述、参数 JSON Schema）随消息发给模型。
2. 模型决定调用某个工具，返回 \`tool_calls\`（含工具名 + JSON 参数）。
3. **你的代码**真正执行这个工具，把结果作为 \`role: "tool"\` 的消息发回去。
4. 模型看到结果，继续——可能再调工具，也可能给最终答案。

\`\`\`json
{
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "查询某城市天气",
      "parameters": {
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"]
      }
    }
  }]
}
\`\`\`

**这正是本工具里 AI 帮你写代码的底层机制**——\`read_file\`、\`write_file\`、\`run\` 都是工具。

> 动手：创建 \`weather_tool.json\`，定义一个 \`get_weather\` 工具的完整 schema（含 name、description、parameters）。`,
      en: `## The model requests actions; it never runs them

Talking isn't enough. **Tool use (function calling)** lets the model request actions: read a file, fetch weather, run code.

It's a loop:

1. You send a **tool list** (name, description, JSON-Schema params) alongside the messages.
2. The model returns \`tool_calls\` (tool name + JSON args).
3. **Your code** actually runs the tool and sends the result back as a \`role: "tool"\` message.
4. The model reads the result and continues — another tool, or a final answer.

\`\`\`json
{
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get weather for a city",
      "parameters": {
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"]
      }
    }
  }]
}
\`\`\`

**This is exactly how the AI in this very tool edits your code** — \`read_file\`, \`write_file\`, \`run\` are all tools.

> Hands-on: create \`weather_tool.json\` with a complete \`get_weather\` tool schema (name, description, parameters).`,
    },
    tasks: [
      {
        id: 'l2-t1',
        instruction:
          'Create `weather_tool.json` with a valid function-tool schema named `get_weather` that has a `parameters` object with a `city` string property. / 创建 `weather_tool.json`，定义名为 `get_weather` 的工具，参数含字符串 `city`。',
        check: {
          kind: 'contains',
          target: 'weather_tool.json',
          needles: ['get_weather', 'parameters', 'city'],
        },
      },
    ],
  },
  {
    id: 'l3-skills',
    order: 3,
    concept: 'skills',
    title: { zh: '第三关：可复用的 Skills', en: 'Lesson 3: Reusable Skills' },
    summary: {
      zh: '把“专家知识 + 操作步骤”打包成一个 Skill：一段带说明的指令包，模型按需加载，避免每次重复教。',
      en: 'Package expertise + steps into a Skill: an on-demand instruction bundle so you stop re-teaching the model.',
    },
    minutes: 12,
    xp: 200,
    body: {
      zh: `## Skill：给模型的“可安装能力包”

每次都把完整流程塞进 prompt 太浪费。**Skill** 是一个自包含的能力包：一份带元数据的说明文档（什么时候用、怎么做、注意事项），模型在需要时才加载它。

一个 Skill 通常长这样（\`SKILL.md\`）：

\`\`\`markdown
---
name: pdf-report
description: 当用户需要把数据导出成带图表的 PDF 报告时使用。
---

## 步骤
1. 用 pandas 读取数据
2. 用 matplotlib 画图保存为 png
3. 用 reportlab 拼装 PDF
## 注意
- 中文字体要显式设置，否则乱码
\`\`\`

关键三点：**name**（标识）、**description**（路由——模型靠它判断该不该用）、**body**（具体怎么做）。这就是 Claude Code 的 Skills、以及很多 agent 框架里“技能/插件”的本质。

> 动手：创建 \`skills/code-review/SKILL.md\`，包含 YAML 头（name + description）和一段“如何做代码评审”的步骤说明。`,
      en: `## A Skill is an installable capability pack for the model

Stuffing the full procedure into every prompt is wasteful. A **Skill** is a self-contained capability pack: a documented bundle (when to use it, how to do it, gotchas) that the model loads only when needed.

A Skill typically looks like (\`SKILL.md\`):

\`\`\`markdown
---
name: pdf-report
description: Use when the user needs data exported to a PDF report with charts.
---

## Steps
1. Read data with pandas
2. Plot with matplotlib, save png
3. Assemble PDF with reportlab
## Gotchas
- Set CJK fonts explicitly or text breaks
\`\`\`

Three keys: **name** (id), **description** (routing — the model uses it to decide whether to load the skill), **body** (the how). This is exactly what Claude Code's Skills and most agent "skills/plugins" are.

> Hands-on: create \`skills/code-review/SKILL.md\` with a YAML header (name + description) and step-by-step "how to review code" instructions.`,
    },
    tasks: [
      {
        id: 'l3-t1',
        instruction:
          'Create `skills/code-review/SKILL.md` with YAML frontmatter containing `name` and `description`, plus a steps section. / 创建带 name 和 description 头部、含步骤说明的 SKILL.md。',
        check: {
          kind: 'llm',
          rubric:
            'The file skills/code-review/SKILL.md must have YAML frontmatter with both a name and a description field, and a body describing how to perform a code review in steps. Pass only if frontmatter (name+description) and step-like body are present.',
        },
      },
    ],
  },
  {
    id: 'l4-mcp',
    order: 4,
    concept: 'mcp',
    title: { zh: '第四关：MCP — 工具的“USB 接口”', en: 'Lesson 4: MCP — the USB Port for Tools' },
    summary: {
      zh: '理解 Model Context Protocol：一个标准协议，让任何 agent 都能即插即用地接入外部工具/数据源（servers）。',
      en: 'Understand the Model Context Protocol: a standard so any agent can plug in external tools/data sources (servers).',
    },
    minutes: 12,
    xp: 200,
    body: {
      zh: `## MCP：让工具可以“即插即用”

Tool Use 解决了“模型能调工具”，但每个 app 各写一套，无法复用。**MCP（Model Context Protocol）** 是 Anthropic 提出的开放标准——把工具/资源做成一个 **MCP server**，任何支持 MCP 的 **client（agent）** 都能连上用。就像 USB：一次实现，到处可插。

一个 MCP server 暴露三类东西：

- **tools**：可执行的函数（和上一关的工具一样，但跨进程标准化了）。
- **resources**：可读取的数据（文件、数据库行、API 响应）。
- **prompts**：预置的提示词模板。

客户端配置常长这样：

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"]
    }
  }
}
\`\`\`

**意义**：你给自己的 agent 加一个新能力（查数据库、发邮件、读 Notion），不用改 agent 代码，只要接一个 MCP server。

> 动手：创建 \`mcp.config.json\`，配置一个名为 \`filesystem\` 的 MCP server（含 command 与 args）。`,
      en: `## MCP makes tools plug-and-play

Tool use lets a model call tools, but every app reinvents them. **MCP (Model Context Protocol)**, an open standard from Anthropic, packages tools/resources as an **MCP server** that any MCP-aware **client (agent)** can connect to. Like USB: implement once, plug in anywhere.

An MCP server exposes three things:

- **tools** — callable functions (like last lesson, but standardized across processes).
- **resources** — readable data (files, DB rows, API responses).
- **prompts** — reusable prompt templates.

A client config often looks like:

\`\`\`json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"]
    }
  }
}
\`\`\`

**Why it matters:** to give your agent a new capability (query a DB, send email, read Notion) you don't touch the agent code — you just connect an MCP server.

> Hands-on: create \`mcp.config.json\` configuring an MCP server named \`filesystem\` (with command and args).`,
    },
    tasks: [
      {
        id: 'l4-t1',
        instruction:
          'Create `mcp.config.json` with an `mcpServers` object containing a `filesystem` server that has `command` and `args`. / 创建含 mcpServers.filesystem（带 command 与 args）的配置文件。',
        check: {
          kind: 'contains',
          target: 'mcp.config.json',
          needles: ['mcpServers', 'filesystem', 'command', 'args'],
        },
      },
    ],
  },
  {
    id: 'l5-agent',
    order: 5,
    concept: 'agent',
    title: { zh: '第五关：组装你自己的 Agent', en: 'Lesson 5: Assemble Your Own Agent' },
    summary: {
      zh: '把前四关合体：system prompt + 工具 + 循环 = agent。你将写出一个真正能跑的最小 agent 主循环。',
      en: 'Combine everything: system prompt + tools + a loop = an agent. You will write a real minimal agent loop that runs.',
    },
    minutes: 18,
    xp: 350,
    body: {
      zh: `## Agent = 提示词 + 工具 + 循环

一个 agent 的本质极其简单，就是一个 **while 循环**：

\`\`\`
while 没结束:
    回复 = 模型(messages, 工具列表)
    如果 回复里有 tool_calls:
        for 每个调用: 执行工具, 把结果加回 messages
    否则:
        return 回复   # 最终答案
\`\`\`

这正是本平台左侧 AI 的真实结构。前四关你已集齐零件：

- **system prompt**（第1关）定义它是谁、目标是什么。
- **tools**（第2关）是它的手。
- **skills / MCP**（第3、4关）是可插拔的能力扩展。
- **循环**把它们串成自主行为。

> 动手（毕业项目）：创建 \`agent.js\`，用 Node 写一个最小 agent 主循环骨架：要有一个 \`messages\` 数组、一个 \`tools\` 定义、一个 \`while\` 循环，循环里要有“如果有 tool_calls 就执行并把结果 push 回 messages，否则跳出返回”的逻辑。然后在右边点“运行”，让它至少能打印出第一轮的思路。完成它，你就毕业了——你已经理解了现代 AI agent 的全部核心概念。`,
      en: `## Agent = prompt + tools + loop

An agent is, at its core, a **while loop**:

\`\`\`
while not done:
    reply = model(messages, tools)
    if reply has tool_calls:
        for each call: run the tool, append result to messages
    else:
        return reply   # final answer
\`\`\`

That is literally the structure of the AI on the left of this platform. You already have every part from lessons 1–4:

- **system prompt** (L1) — who it is and its goal.
- **tools** (L2) — its hands.
- **skills / MCP** (L3, L4) — pluggable capability extensions.
- **the loop** — wires them into autonomous behavior.

> Hands-on (capstone): create \`agent.js\` — a minimal Node agent-loop skeleton with a \`messages\` array, a \`tools\` definition, and a \`while\` loop containing the "if tool_calls then run + push results, else break and return" logic. Then hit Run on the right so it prints at least its first step. Finish this and you graduate — you now understand every core concept of a modern AI agent.`,
    },
    tasks: [
      {
        id: 'l5-t1',
        instruction:
          'Create `agent.js` implementing a minimal agent loop skeleton: a messages array, a tools array/definition, and a while loop that handles tool_calls vs final answer. / 写出含 messages、tools、while 循环（处理 tool_calls 与最终答案）的 agent.js。',
        check: {
          kind: 'llm',
          rubric:
            'The file agent.js should contain a recognizable minimal agent loop: (a) a messages array, (b) some tools definition/array, (c) a loop (while/for) that branches on whether the model output contains tool calls vs a final answer. It does not need to actually call a real API. Pass if the loop structure and the three parts are clearly present.',
        },
      },
    ],
  },
];

export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));
