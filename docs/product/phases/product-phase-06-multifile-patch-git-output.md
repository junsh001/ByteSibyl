# Product Phase 06: Multi-file Patch & Git Output

## Phase

P6: Multi-file Patch & Git Output

## Product Goal

支持真实小型项目中常见的多文件修改，让用户可以逐文件审阅 Patch，
应用后查看 Git diff，并导出 patch / commit message 草稿。

## User Value

- 用户可以一次审阅多个文件的新增、修改、删除和重命名。
- 用户可以在应用前发现冲突，避免覆盖 workspace 中的新变化。
- 用户可以拿到可复制的 patch 输出和 commit message 草稿。

## Allowed Scope

- 扩展 Patch Proposal shared contract，保持单文件兼容。
- 扩展 patch-engine 生成多文件 diff 明细和组合 patch。
- 扩展 patch routes 支持多文件 preview、apply、Git diff 输出。
- Web Review tab 支持逐文件查看、导出 patch、复制 commit message。
- 编写 P6 产品需求、设计文档、中文教程和中文博客。

## Forbidden Scope

- 不实现 P7 Model Routing、预算、成本控制。
- 不实现 P8 大规模 UX hardening、虚拟化或快捷键体系。
- 不实现 P9 policy manifest、不可变审计或 secret redaction。
- 不自动创建或合并 PR；PR 只允许作为草稿输出说明。
- 不绕过现有 approval 和 guardrails。

## Required Artifacts

- `docs/product/phases/product-phase-06-multifile-patch-git-output.md`
- `docs/design/product-phase-06-multifile-patch-git-output.md`
- `docs/tutorial/product-phase-06-multifile-patch-git-output.md`
- `docs/blog/product-phase-06-multifile-patch-git-output.md`
- Runtime code.
- Web UI changes.
- Smoke checks for multi-file preview/apply and Git output.

## Architecture Impact

### Memory

不新增 memory 层。Patch Proposal 的多文件明细会进入现有 session/trace 存储。

### Tool Governance

不新增工具权限类型。多文件 apply 仍使用 `write_patch` 和 approval。

### Context Lifecycle

不改变 Context Engine。未来 Agent 可以利用多文件 patch 输出，但 P6 不改变上下文构建。

### Skills / Plugins / MCP

不改变 skill、plugin 或 MCP 机制。

### Security and Sandbox

多文件 apply 必须：

- 留在 workspace path boundary 内。
- 经过现有 approval。
- 对每个文件做 conflict 检测。
- 不处理二进制文件。

## Web UI Requirements

- Review tab 显示多文件列表、状态、增删行数。
- 用户可以逐文件打开 Monaco Diff。
- 用户可以下载 `.patch` 文件。
- 用户可以查看 commit message 草稿。
- 冲突、空 patch、blocked 状态需要清楚显示。

## Acceptance Criteria

1. `/api/patches/preview` 可以创建包含多个文件的 Patch Proposal。
2. 多文件 proposal 支持 create、modify、delete、rename。
3. 用户可以逐文件查看 diff。
4. Apply 前会检测 workspace 当前内容是否与 proposal 基线一致。
5. Apply 后返回 Git diff，且与 UI 展示的 patch 输出一致。
6. Web 可以导出 patch 文件和展示 commit message 草稿。

## Validation Commands

```bash
npm run typecheck
npm run build
git diff --check
```

## Smoke Tests

- 创建多文件 preview：修改一个文件、新增一个文件。
- 请求 approval、批准、apply。
- 验证 apply response 包含 git diff。
- 导出 patch 文本与 proposal unified diff 一致。

## Migration and Rollback

无数据库迁移。新增字段为 optional，旧单文件 proposal 继续可读。回滚时删除 P6
代码后，旧单文件 patch 流程仍可工作。

## Documentation Requirements

- Design doc: 多文件 proposal contract、apply 顺序、conflict 检测。
- Tutorial chapter: 如何安全实现多文件 Patch 和 Git 输出。
- Blog draft: 为什么产品级 Coding Agent 需要多文件 diff 和 Git output。

## Remaining Risks

- 当前阶段不支持二进制 diff。
- rename conflict 只做路径和内容基线检查，不做复杂 merge。
- PR 只生成草稿信息，不调用 GitHub API。
