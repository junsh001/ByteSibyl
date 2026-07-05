import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AgentRunId,
  AgentRunEvent,
  AgentSession,
  AgentShellEvent,
  ApprovalRequest,
  DiagnosticsResponse,
  HealthResponse,
  HookRecord,
  ModelProviderInfo,
  PatchProposal,
  SearchTextMatch,
  SelfRepairAttempt,
  ShellCommandResult,
  SkillInfo,
  SkillSelection,
  SessionLogResponse,
  ToolDefinition,
  ToolResult,
  TodoItem,
  WorkspaceFileNode,
  WorkspaceInfo,
} from '@wac/shared';
import { api, connectSessionEvents } from './api';
import { countDiagnostics, formatDiagnosticTimestamp } from './features/diagnostics';
import { TodoPanel } from './features/todo-panel';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [modelProvider, setModelProvider] = useState<ModelProviderInfo | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [tree, setTree] = useState<WorkspaceFileNode | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchTextMatch[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [currentSkill, setCurrentSkill] = useState<SkillSelection | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);
  const [shellCommand, setShellCommand] = useState('npm run typecheck');
  const [shellResult, setShellResult] = useState<ShellCommandResult | null>(null);
  const [shellRunning, setShellRunning] = useState(false);
  const [repairCommand, setRepairCommand] = useState('npm run typecheck');
  const [repairAttempt, setRepairAttempt] = useState<SelfRepairAttempt | null>(null);
  const [repairRunning, setRepairRunning] = useState(false);
  const [repairVerifying, setRepairVerifying] = useState(false);
  const [patchDraft, setPatchDraft] = useState('');
  const [patchProposal, setPatchProposal] = useState<PatchProposal | null>(null);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [agentPrompt, setAgentPrompt] = useState('获取 TypeScript diagnostics 并说明当前类型错误');
  const [agentEvents, setAgentEvents] = useState<AgentRunEvent[]>([]);
  const [agentRunning, setAgentRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<AgentRunId | null>(null);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [sessionLog, setSessionLog] = useState<SessionLogResponse | null>(null);
  const [events, setEvents] = useState<AgentShellEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stopAgentStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void Promise.all([
      api.health(),
      api.modelProviderStatus(),
      api.workspace(),
      api.workspaceTree(),
      api.tools(),
      api.skills(),
      api.diagnostics(),
      api.todos(),
    ])
      .then(
        ([
          healthResult,
          providerResult,
          workspaceResult,
          treeResult,
          toolResult,
          skillResult,
          diagnosticsResult,
          todoResult,
        ]) => {
          setHealth(healthResult);
          setModelProvider(providerResult.provider);
          setWorkspace(workspaceResult);
          setTree(treeResult);
          setTools(toolResult.tools);
          setSkills(skillResult.skills);
          setDiagnostics(diagnosticsResult);
          setTodos(todoResult.todos);
          const first = findFirstFile(treeResult);
          if (first) {
            void openFile(first.path);
          }
        },
      )
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    return connectSessionEvents(
      session.id,
      (event) => setEvents((current) => [event, ...current].slice(0, 20)),
      setError,
    );
  }, [session]);

  const sessionLabel = useMemo(() => {
    if (!session) return '尚未创建 Session';
    return `${session.title} · ${session.status} · ${session.id.slice(0, 8)}`;
  }, [session]);

  const latestContextSummary = useMemo(() => {
    for (let index = agentEvents.length - 1; index >= 0; index -= 1) {
      const event = agentEvents[index];
      if (event?.type === 'agent.context_summary') return event.summary;
    }
    const persisted = sessionLog?.runs
      .flatMap((run) => run.events)
      .filter((event) => event.type === 'agent.context_summary')
      .at(-1);
    return persisted?.type === 'agent.context_summary' ? persisted.summary : null;
  }, [agentEvents, sessionLog]);

  const recentHooks = useMemo(() => sessionLog?.hooks.slice(-5).reverse() ?? [], [sessionLog]);
  const blockedHookCount = useMemo(
    () => sessionLog?.hooks.filter((hook) => hook.status === 'blocked').length ?? 0,
    [sessionLog],
  );

  const patchFlowHint = useMemo(() => {
    if (!selectedFile) return '先在左侧选择文件。';
    if (!patchProposal) return '可以直接生成 Diff Preview，或请求审批时自动生成。';
    if (patchProposal.status === 'blocked') return 'Guardrails 已拦截该 Patch。';
    if (patchProposal.status === 'waiting_approval') return '等待批准或拒绝。';
    if (patchProposal.status === 'approved') return '已批准，可以应用 Patch。';
    if (patchProposal.status === 'applied') return 'Patch 已应用到 workspace 文件。';
    if (patchProposal.status === 'rejected') return '审批已拒绝，请重新生成 Patch Proposal。';
    if (patchProposal.status === 'discarded') return 'Patch Proposal 已丢弃，请重新生成。';
    return 'Patch Proposal 已生成，可以请求审批。';
  }, [patchProposal, selectedFile]);

  async function createSession() {
    setError(null);
    const result = await api.createSession('Phase 15 Hooks');
    setSession(result.session);
    setSessionLog(null);
    setEvents([{ type: 'session.created', session: result.session }]);
  }

  async function refreshSessionLog(targetSession = session) {
    if (!targetSession) return;
    const result = await api.sessionLog(targetSession.id);
    setSession(result.session);
    setSessionLog(result);
  }

  async function refreshDiagnostics() {
    setError(null);
    setDiagnosticsLoading(true);
    try {
      setDiagnostics(await api.diagnostics());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiagnosticsLoading(false);
    }
  }

  async function openFile(path: string) {
    setError(null);
    const result = await api.readWorkspaceFile(path);
    setSelectedFile(result);
    setPatchDraft(result.content);
    setPatchProposal(null);
    setApproval(null);
  }

  async function createPatchPreview() {
    if (!selectedFile) return;
    setError(null);
    try {
      const result = await createPatchPreviewForSelectedFile();
      setPatchProposal(result.proposal);
      setApproval(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function createPatchPreviewForSelectedFile() {
    if (!selectedFile) throw new Error('请选择文件后再生成 Patch Preview。');
    const activeSession =
      session ?? (await api.createSession('Phase 15 Hooks')).session;
    setSession(activeSession);
    const result = await api.createPatchPreview({
      sessionId: activeSession.id,
      path: selectedFile.path,
      updatedContent: patchDraft,
    });
    await refreshSessionLog(activeSession);
    return result;
  }

  async function discardPatch() {
    if (!patchProposal) return;
    setError(null);
    try {
      const result = await api.discardPatch(patchProposal.id);
      setPatchProposal(result.proposal);
      setApproval(null);
      await refreshSessionLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function requestPatchApproval() {
    if (!selectedFile) return;
    setError(null);
    try {
      const proposal =
        patchProposal && ['proposed', 'blocked'].includes(patchProposal.status)
          ? patchProposal
          : (await createPatchPreviewForSelectedFile()).proposal;
      setPatchProposal(proposal);
      const result = await api.requestPatchApproval(proposal.id);
      setPatchProposal(result.proposal);
      setApproval(result.approval ?? null);
      if (result.decision.effect === 'deny') {
        const message = result.decision.violations.map((violation) => violation.message).join(' ');
        setError(message || result.decision.reason);
      }
      await refreshSessionLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function approvePatch() {
    if (!approval) return;
    setError(null);
    try {
      const result = await api.approvePatch(approval.id);
      setPatchProposal(result.proposal);
      setApproval(result.approval);
      await refreshSessionLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function rejectPatch() {
    if (!approval) return;
    setError(null);
    try {
      const result = await api.rejectPatch(approval.id);
      setPatchProposal(result.proposal);
      setApproval(result.approval);
      await refreshSessionLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function applyPatch() {
    if (!patchProposal) return;
    setError(null);
    try {
      const result = await api.applyPatch(patchProposal.id);
      setPatchProposal(result.proposal);
      setPatchDraft(result.content);
      if (selectedFile?.path === result.proposal.path) {
        setSelectedFile({ path: result.proposal.path, content: result.content });
      }
      await refreshSessionLog();
      setTree(await api.workspaceTree());
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function search() {
    setError(null);
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      return;
    }
    const result = await api.searchWorkspace(searchQuery);
    setSearchMatches(result.matches);
  }

  async function runReadTool() {
    if (!selectedFile) return;
    setError(null);
    const result = await api.runTool({
      name: 'read_file',
      input: { path: selectedFile.path },
    });
    setToolResult(result);
  }

  async function runShellCommand() {
    setError(null);
    setShellRunning(true);
    try {
      const activeSession =
        session ?? (await api.createSession('Phase 15 Hooks')).session;
      setSession(activeSession);
      const result = await api.runShellCommand({
        sessionId: activeSession.id,
        command: shellCommand,
        timeoutMs: 10_000,
      });
      setShellResult(result.result);
      await refreshSessionLog(activeSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setShellRunning(false);
    }
  }

  async function runAgent() {
    setError(null);
    setAgentEvents([]);
    setAgentRunning(true);
    setCurrentRunId(null);
    try {
      const activeSession =
        session ?? (await api.createSession('Phase 15 Hooks')).session;
      setSession(activeSession);
      stopAgentStreamRef.current = api.runAgent(
        { sessionId: activeSession.id, message: agentPrompt, maxIterations: 6 },
        (event) => {
          setAgentEvents((current) => [...current, event]);
          if (event.type === 'agent.run_created') {
            setSession(event.session);
            setCurrentRunId(event.run.id);
          }
          if (event.type === 'agent.todo_updated') {
            setTodos(event.todos);
          }
          if (event.type === 'agent.skill_selected') {
            setCurrentSkill(event.selection);
          }
          if (event.type === 'agent.done' || event.type === 'agent.error') {
            setAgentRunning(false);
            setCurrentRunId(null);
            stopAgentStreamRef.current = null;
            void refreshSessionLog(activeSession);
          }
        },
        (message) => {
          setAgentRunning(false);
          setError(message);
          setCurrentRunId(null);
          stopAgentStreamRef.current = null;
        },
      );
    } catch (err) {
      setAgentRunning(false);
      setCurrentRunId(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function cancelAgent() {
    if (!currentRunId) return;
    setError(null);
    try {
      await api.cancelRun(currentRunId);
    } catch (err) {
      setAgentRunning(false);
      stopAgentStreamRef.current?.();
      stopAgentStreamRef.current = null;
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function startSelfRepair() {
    setError(null);
    setRepairRunning(true);
    try {
      const activeSession =
        session ?? (await api.createSession('Phase 15 Hooks')).session;
      setSession(activeSession);
      const result = await api.startSelfRepair({
        sessionId: activeSession.id,
        command: repairCommand,
      });
      setSession(result.session);
      setShellResult(result.commandResult);
      setRepairAttempt(result.repair);
      if (result.proposal) {
        setPatchProposal(result.proposal);
        setApproval(result.approval ?? null);
        if (result.proposal.updatedContent !== undefined) {
          const file = await api.readWorkspaceFile(result.proposal.path);
          setSelectedFile(file);
          setPatchDraft(result.proposal.updatedContent);
        }
      }
      await refreshSessionLog(result.session);
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRepairRunning(false);
    }
  }

  async function verifySelfRepair() {
    if (!session) return;
    setError(null);
    setRepairVerifying(true);
    try {
      const result = await api.verifySelfRepair({
        sessionId: session.id,
        command: repairCommand,
        patchId: patchProposal?.id,
      });
      setShellResult(result.commandResult);
      setRepairAttempt(result.repair);
      await refreshSessionLog(session);
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRepairVerifying(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 15</p>
          <h1>Web AI Coding Agent Lab</h1>
        </div>
        <div className="status-group">
          <span className={health?.ok ? 'status-dot ok' : 'status-dot'} />
          <span>{health ? `${health.service} · ${health.phase}` : '连接 Server 中'}</span>
        </div>
      </header>

      <main className="ide-grid">
        <aside className="panel file-tree">
          <div className="panel-header">
            <span>{workspace?.rootName ?? 'Workspace'}</span>
            <small>{tree ? `${countFiles(tree)} files` : 'loading'}</small>
          </div>
          <div className="workspace-tools">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search();
              }}
              placeholder="搜索文本"
            />
            <button type="button" onClick={() => void search()}>
              搜索
            </button>
          </div>
          <div className="tree-scroll">
            {tree ? (
              <FileTreeNode node={tree} selectedPath={selectedFile?.path} onOpen={openFile} />
            ) : (
              <div className="empty-state">加载中...</div>
            )}
          </div>
          {searchMatches.length > 0 ? (
            <div className="search-results">
              {searchMatches.map((match) => (
                <button
                  type="button"
                  key={`${match.path}:${match.line}:${match.column}`}
                  onClick={() => void openFile(match.path)}
                >
                  <strong>{match.path}</strong>
                  <span>
                    {match.line}:{match.column} {match.snippet}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </aside>

        <section className="panel editor">
          <div className="panel-header">
            <span>{selectedFile?.path ?? 'Editor'}</span>
            <small>{selectedFile ? `${selectedFile.content.split(/\r?\n/).length} lines` : ''}</small>
          </div>
          <div className="editor-placeholder">
            <div className="line-gutter">
              {(selectedFile?.content.split(/\r?\n/) ?? ['']).map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            <pre>{selectedFile?.content ?? '选择左侧文件'}</pre>
          </div>
        </section>

        <aside className="panel agent-panel">
          <div className="panel-header">
            <span>Agent Chat</span>
            <small>{sessionLabel}</small>
          </div>
          <button className="primary-action" type="button" onClick={() => void createSession()}>
            创建 Agent Session
          </button>
          <div className="chat-placeholder">
            <p>Model Provider 可以使用 mock 或真实 OpenAI-compatible API。</p>
            <p>Hooks 会在工具调用、文件编辑和命令执行边界做确定性拦截与记录。</p>
          </div>
          <div className="provider-box">
            <div className="todo-title">Model Provider</div>
            <div className="state-row">
              <span>Provider</span>
              <strong>{modelProvider?.provider ?? 'loading'}</strong>
            </div>
            <div className="state-row">
              <span>Model</span>
              <strong>{modelProvider?.model ?? 'unknown'}</strong>
            </div>
            <div className="state-row">
              <span>Status</span>
              <strong>{modelProvider?.status ?? 'unknown'}</strong>
            </div>
            <div className="repair-message">
              {modelProvider?.message ?? '正在读取 Server 端 provider 配置。'}
            </div>
          </div>
          <div className="diagnostics-box">
            <div className="diagnostics-header">
              <div>
                <div className="todo-title">LSP Diagnostics</div>
                <small>
                  {diagnostics?.generatedAt
                    ? formatDiagnosticTimestamp(diagnostics.generatedAt)
                    : 'loading'}
                </small>
              </div>
              <button type="button" disabled={diagnosticsLoading} onClick={() => void refreshDiagnostics()}>
                {diagnosticsLoading ? '刷新中' : '刷新'}
              </button>
            </div>
            <div className="state-row">
              <span>Errors</span>
              <strong>{countDiagnostics(diagnostics?.diagnostics ?? [], 'error')}</strong>
            </div>
            <div className="state-row">
              <span>Total</span>
              <strong>{diagnostics?.diagnostics.length ?? 0}</strong>
            </div>
            <div className="diagnostic-list">
              {(diagnostics?.diagnostics ?? []).length === 0 ? (
                <div className="diagnostic-empty">当前 workspace 没有 TypeScript diagnostics。</div>
              ) : (
                diagnostics?.diagnostics.slice(0, 8).map((diagnostic) => (
                  <button
                    type="button"
                    key={`${diagnostic.path}:${diagnostic.line}:${diagnostic.column}:${diagnostic.message}`}
                    onClick={() => void openFile(diagnostic.path)}
                  >
                    <span className={`diagnostic-severity ${diagnostic.severity}`}>
                      {diagnostic.severity}
                    </span>
                    <strong>
                      {diagnostic.path}:{diagnostic.line}:{diagnostic.column}
                    </strong>
                    <span>{diagnostic.message}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="context-box">
            <div className="todo-title">Context Engine</div>
            <div className="state-row">
              <span>Budget</span>
              <strong>
                {latestContextSummary
                  ? `${latestContextSummary.budget.usedChars}/${latestContextSummary.budget.maxChars}`
                  : 'waiting'}
              </strong>
            </div>
            <div className="state-row">
              <span>Relevant files</span>
              <strong>{latestContextSummary?.relevantFiles.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Compressed</span>
              <strong>{latestContextSummary?.compressedObservationCount ?? 0}</strong>
            </div>
            <div className="repair-message">
              {latestContextSummary
                ? latestContextSummary.taskSummary
                : '运行 Agent Loop 后会显示本轮模型调用前的 context summary。'}
            </div>
          </div>
          <div className="planner-box">
            <div className="todo-title">Todo Planner</div>
            <TodoPanel todos={todos} />
          </div>
          <div className="skill-box">
            <div className="todo-title">Skills</div>
            <div className="state-row">
              <span>Loaded</span>
              <strong>{skills.length}</strong>
            </div>
            <div className="state-row">
              <span>Current</span>
              <strong>{currentSkill?.skill.name ?? 'none'}</strong>
            </div>
            <div className="repair-message">
              {currentSkill
                ? `${currentSkill.reason} · ${currentSkill.skill.description}`
                : '运行 Agent Loop 后会根据任务选择匹配的 skill。'}
            </div>
          </div>
          <div className="hook-box">
            <div className="todo-title">Hooks</div>
            <div className="state-row">
              <span>Recorded</span>
              <strong>{sessionLog?.hooks.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Blocked</span>
              <strong>{blockedHookCount}</strong>
            </div>
            <div className="hook-list">
              {recentHooks.length === 0 ? (
                <div className="hook-empty">运行命令、生成 Patch 或执行 Agent 后会显示 Hook trace。</div>
              ) : (
                recentHooks.map((hook) => (
                  <div className={`hook-item ${hook.status}`} key={hook.id}>
                    <span>{hook.status}</span>
                    <strong>{hook.phase}</strong>
                    <small>{hook.subject}</small>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="repair-box">
            <div className="todo-title">Self-Repair Loop</div>
            <input
              value={repairCommand}
              onChange={(event) => setRepairCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void startSelfRepair();
              }}
            />
            <button
              className="primary-action compact"
              type="button"
              disabled={repairRunning || !repairCommand.trim()}
              onClick={() => void startSelfRepair()}
            >
              {repairRunning ? '检测中...' : '运行自修复循环'}
            </button>
            <button
              className="secondary-action"
              type="button"
              disabled={
                !session ||
                repairVerifying ||
                Boolean(patchProposal && patchProposal.status !== 'applied')
              }
              onClick={() => void verifySelfRepair()}
            >
              {repairVerifying ? '验证中...' : '重新验证'}
            </button>
            <div className="state-row">
              <span>Repair</span>
              <strong>{repairAttempt?.status ?? 'none'}</strong>
            </div>
            <div className="repair-message">
              {repairAttempt?.message ?? '运行后会生成修复记录；需要修改文件时会进入审批流程。'}
            </div>
          </div>
          <div className="shell-box">
            <div className="todo-title">Shell Runner</div>
            <input
              value={shellCommand}
              onChange={(event) => setShellCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void runShellCommand();
              }}
            />
            <button
              className="primary-action compact"
              type="button"
              disabled={shellRunning || !shellCommand.trim()}
              onClick={() => void runShellCommand()}
            >
              {shellRunning ? '执行中...' : '运行安全命令'}
            </button>
            {shellResult ? (
              <div className="shell-result">
                <div className="state-row">
                  <span>Status</span>
                  <strong>{shellResult.status}</strong>
                </div>
                <div className="state-row">
                  <span>Safety</span>
                  <strong>{shellResult.safety}</strong>
                </div>
                <pre>{shellResult.stdout || shellResult.stderr || shellResult.decision.reason}</pre>
              </div>
            ) : null}
          </div>
          <div className="patch-box">
            <div className="todo-title">Patch Draft</div>
            <small>{selectedFile?.path ?? '选择文件后编辑草稿'}</small>
            <textarea
              value={patchDraft}
              disabled={!selectedFile}
              onChange={(event) => setPatchDraft(event.target.value)}
              rows={6}
            />
            <button
              className="primary-action compact"
              type="button"
              disabled={!selectedFile}
              onClick={() => void createPatchPreview()}
            >
              生成 Diff Preview
            </button>
            <button
              className="secondary-action"
              type="button"
              disabled={
                !patchProposal ||
                ['discarded', 'applied', 'approved', 'waiting_approval'].includes(
                  patchProposal.status,
                )
              }
              onClick={() => void discardPatch()}
            >
              丢弃 Patch Proposal
            </button>
            <button
              className="secondary-action"
              type="button"
              disabled={!selectedFile}
              onClick={() => void requestPatchApproval()}
            >
              请求审批
            </button>
            <div className="approval-actions">
              <button
                type="button"
                disabled={!approval || approval.status !== 'pending'}
                onClick={() => void approvePatch()}
              >
                批准
              </button>
              <button
                type="button"
                disabled={!approval || approval.status !== 'pending'}
                onClick={() => void rejectPatch()}
              >
                拒绝
              </button>
            </div>
            <button
              className="primary-action compact"
              type="button"
              disabled={!patchProposal || patchProposal.status !== 'approved'}
              onClick={() => void applyPatch()}
            >
              应用已批准 Patch
            </button>
            <div className="state-row">
              <span>Patch</span>
              <strong>{patchProposal?.status ?? 'none'}</strong>
            </div>
            <div className="state-row">
              <span>Approval</span>
              <strong>{approval?.status ?? 'none'}</strong>
            </div>
            <div className="patch-flow-hint">{patchFlowHint}</div>
          </div>
          <div className="agent-run-box">
            <label htmlFor="agent-prompt">Agent Task</label>
            <textarea
              id="agent-prompt"
              value={agentPrompt}
              onChange={(event) => setAgentPrompt(event.target.value)}
              rows={3}
            />
            <button
              className="primary-action compact"
              type="button"
              disabled={agentRunning}
              onClick={() => void runAgent()}
            >
              {agentRunning ? '运行中...' : '运行 Agent Loop'}
            </button>
            <button
              className="secondary-action"
              type="button"
              disabled={!agentRunning || !currentRunId}
              onClick={() => void cancelAgent()}
            >
              取消当前 Run
            </button>
          </div>
          <div className="session-state-box">
            <div className="todo-title">Session State</div>
            <div className="state-row">
              <span>Session</span>
              <strong>{session?.status ?? 'none'}</strong>
            </div>
            <div className="state-row">
              <span>Run</span>
              <strong>{currentRunId ? currentRunId.slice(0, 8) : 'none'}</strong>
            </div>
            <div className="state-row">
              <span>Persisted runs</span>
              <strong>{sessionLog?.runs.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Patch proposals</span>
              <strong>{sessionLog?.patches.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Approvals</span>
              <strong>{sessionLog?.approvals.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Commands</span>
              <strong>{sessionLog?.commands.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Repairs</span>
              <strong>{sessionLog?.repairs.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Model calls</span>
              <strong>{sessionLog?.modelCalls.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Hooks</span>
              <strong>{sessionLog?.hooks.length ?? 0}</strong>
            </div>
            <div className="state-row">
              <span>Context summaries</span>
              <strong>
                {sessionLog?.runs.reduce(
                  (total, run) =>
                    total + run.events.filter((event) => event.type === 'agent.context_summary').length,
                  0,
                ) ?? 0}
              </strong>
            </div>
            <div className="state-row">
              <span>Todos</span>
              <strong>{todos.length}</strong>
            </div>
            <div className="state-row">
              <span>Skill</span>
              <strong>{currentSkill?.skill.name ?? 'none'}</strong>
            </div>
            <button
              className="secondary-action"
              type="button"
              disabled={!session}
              onClick={() => void refreshSessionLog()}
            >
              刷新 Session Log
            </button>
          </div>
          <div className="tool-box">
            <div className="todo-title">Tool System</div>
            <div className="tool-list">
              {tools.map((tool) => (
                <div key={tool.name} className="tool-item">
                  <strong>{tool.name}</strong>
                  <span>{tool.permission}</span>
                </div>
              ))}
            </div>
            <button
              className="secondary-action"
              type="button"
              disabled={!selectedFile}
              onClick={() => void runReadTool()}
            >
              用 read_file 工具读取当前文件
            </button>
            {toolResult ? (
              <pre className={toolResult.ok ? 'tool-result' : 'tool-result error'}>
                {JSON.stringify(toolResult, null, 2)}
              </pre>
            ) : null}
          </div>
          <div className="todo-box">
            <div className="todo-title">Todo Plan</div>
            <ul>
              <li className="done">Web IDE 五区布局</li>
              <li className="done">Workspace 文件树</li>
              <li className={selectedFile ? 'done' : ''}>读取文件内容</li>
              <li className={searchMatches.length > 0 ? 'done' : ''}>搜索文本</li>
              <li className={tools.length > 0 ? 'done' : ''}>注册结构化工具</li>
              <li className={agentEvents.some((event) => event.type === 'agent.done') ? 'done' : ''}>
                最小 Agent Loop
              </li>
              <li className={sessionLog?.runs.some((run) => run.steps.length > 0) ? 'done' : ''}>
                持久化 Session Step Log
              </li>
              <li className={patchProposal ? 'done' : ''}>生成 Diff Preview</li>
              <li className={approval ? 'done' : ''}>Human-in-the-loop Approval</li>
              <li className={patchProposal?.status === 'applied' ? 'done' : ''}>
                应用已批准 Patch
              </li>
              <li className={shellResult ? 'done' : ''}>安全 Shell Runner</li>
              <li className={repairAttempt ? 'done' : ''}>测试失败后的自修复循环</li>
              <li className={modelProvider ? 'done' : ''}>Model Provider Integration</li>
              <li className={diagnostics ? 'done' : ''}>LSP Diagnostics</li>
              <li className={latestContextSummary ? 'done' : ''}>Context Engine</li>
              <li className={todos.length > 0 ? 'done' : ''}>Todo Planner</li>
              <li className={currentSkill ? 'done' : ''}>Skills</li>
              <li className={(sessionLog?.hooks.length ?? 0) > 0 ? 'done' : ''}>Hooks</li>
            </ul>
          </div>
        </aside>

        <section className="panel bottom-panel">
          <div className="panel-header">
            <span>Terminal / Command Log / Trace Log</span>
            <small>Phase 15 Hooks trace</small>
          </div>
          <div className="log-stream">
            {error ? <div className="log-line error">Error: {error}</div> : null}
            {events.length === 0 ? (
              <div className="log-line muted">等待 session 或 agent 事件...</div>
            ) : (
              events.map((event, index) => (
                <div className="log-line" key={`${event.type}-${index}`}>
                  {event.type === 'session.created'
                    ? `session.created ${event.session.id}`
                    : `${event.type} ${event.message}`}
                </div>
              ))
            )}
            {agentEvents.map((event, index) => (
              <div className="log-line" key={`agent-${index}`}>
                {formatAgentEvent(event)}
              </div>
            ))}
            {sessionLog?.runs.flatMap((run) =>
              run.steps.slice(-6).map((step) => (
                <div className="log-line muted" key={step.id}>
                  persisted {run.id.slice(0, 8)} {step.type} {step.title}
                </div>
              )),
            )}
            {sessionLog?.patches.slice(-5).map((patch) => (
              <div className="log-line muted" key={patch.id}>
                patch {patch.id.slice(0, 8)} {patch.status} {patch.path} +{patch.additions} -
                {patch.deletions}
              </div>
            ))}
            {sessionLog?.approvals.slice(-5).map((item) => (
              <div className="log-line muted" key={item.id}>
                approval {item.id.slice(0, 8)} {item.status} {item.action} {item.subjectId.slice(0, 8)}
              </div>
            ))}
            {sessionLog?.commands.slice(-5).map((command) => (
              <div className="log-line muted" key={command.id}>
                command {command.id.slice(0, 8)} {command.status} {command.command}
              </div>
            ))}
            {sessionLog?.repairs.slice(-5).map((repair) => (
              <div className="log-line muted" key={repair.id}>
                repair {repair.id.slice(0, 8)} {repair.status} {repair.message}
              </div>
            ))}
            {sessionLog?.modelCalls.slice(-5).map((call) => (
              <div className="log-line muted" key={call.id}>
                model {call.id.slice(0, 8)} {call.provider}/{call.model} {call.status}{' '}
                {call.latencyMs}ms
              </div>
            ))}
            {sessionLog?.hooks.slice(-8).map((hook) => (
              <div className="log-line muted" key={hook.id}>
                hook {formatHookRecord(hook)}
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="diff-preview" aria-label="Diff Preview">
        <div className="diff-preview-header">
          <strong>Diff Preview</strong>
          <span>
            {patchProposal
              ? `${patchProposal.path} +${patchProposal.additions} -${patchProposal.deletions}`
              : '等待 Patch Proposal'}
          </span>
        </div>
        {patchProposal ? (
          <pre>
            {patchProposal.unifiedDiff}
          </pre>
        ) : (
          <div className="diff-empty">编辑 Patch Draft 后生成 proposed diff。</div>
        )}
      </div>
    </div>
  );
}

function FileTreeNode({
  node,
  selectedPath,
  onOpen,
  depth = 0,
}: {
  node: WorkspaceFileNode;
  selectedPath?: string;
  onOpen: (path: string) => Promise<void>;
  depth?: number;
}) {
  if (node.type === 'dir') {
    return (
      <div>
        {node.path ? (
          <div className="tree-row folder" style={{ paddingLeft: 8 + depth * 14 }}>
            {node.name}
          </div>
        ) : null}
        {node.children?.map((child) => (
          <FileTreeNode
            key={child.path || child.name}
            node={child}
            selectedPath={selectedPath}
            onOpen={onOpen}
            depth={node.path ? depth + 1 : depth}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={node.path === selectedPath ? 'tree-row file selected' : 'tree-row file'}
      style={{ paddingLeft: 8 + depth * 14 }}
      onClick={() => void onOpen(node.path)}
    >
      {node.name}
    </button>
  );
}

function findFirstFile(node: WorkspaceFileNode): WorkspaceFileNode | null {
  if (node.type === 'file') return node;
  for (const child of node.children ?? []) {
    const found = findFirstFile(child);
    if (found) return found;
  }
  return null;
}

function countFiles(node: WorkspaceFileNode): number {
  if (node.type === 'file') return 1;
  return (node.children ?? []).reduce((total, child) => total + countFiles(child), 0);
}

function formatAgentEvent(event: AgentRunEvent): string {
  switch (event.type) {
    case 'agent.run_created':
      return `agent.run_created session=${event.session.id.slice(0, 8)} run=${event.run.id.slice(0, 8)}`;
    case 'agent.status':
      return `agent.status ${event.message}`;
    case 'agent.iteration':
      return `agent.iteration ${event.iteration}/${event.maxIterations}`;
    case 'agent.context_summary':
      return `context_summary budget=${event.summary.budget.usedChars}/${event.summary.budget.maxChars} files=${event.summary.relevantFiles.length} diagnostics=${event.summary.diagnostics.length} truncated=${event.summary.budget.truncated}`;
    case 'agent.todo_updated':
      return `todo_updated ${event.reason} active=${event.todos.find((todo) => todo.status === 'in_progress')?.title ?? 'none'}`;
    case 'agent.skill_selected':
      return `skill_selected ${event.selection.skill.name} ${event.selection.reason}`;
    case 'agent.model_call':
      return `model_call ${event.call.provider}/${event.call.model} ${event.call.status} ${event.call.latencyMs}ms`;
    case 'agent.message':
      return `assistant ${event.content}`;
    case 'agent.tool_call':
      return `tool_call ${event.call.name} ${JSON.stringify(event.call.input)}`;
    case 'agent.tool_result':
      return `tool_result ${event.result.name} ok=${event.result.ok} hooks=${event.result.hooks?.length ?? 0}`;
    case 'agent.error':
      return `agent.error ${event.message}`;
    case 'agent.done':
      return `agent.done ${event.finishReason}`;
  }
}

function formatHookRecord(hook: HookRecord): string {
  const summary = hook.summary ? ` summary=${hook.summary}` : '';
  return `${hook.id.slice(0, 8)} ${hook.status} ${hook.phase}/${hook.hookName} ${hook.subject}${summary}`;
}
