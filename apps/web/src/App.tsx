import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AgentRunId,
  AgentRunEvent,
  AgentSession,
  AgentShellEvent,
  HealthResponse,
  PatchProposal,
  SearchTextMatch,
  SessionLogResponse,
  ToolDefinition,
  ToolResult,
  WorkspaceFileNode,
  WorkspaceInfo,
} from '@wac/shared';
import { api, connectSessionEvents } from './api';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [tree, setTree] = useState<WorkspaceFileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchTextMatch[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [toolResult, setToolResult] = useState<ToolResult | null>(null);
  const [patchDraft, setPatchDraft] = useState('');
  const [patchProposal, setPatchProposal] = useState<PatchProposal | null>(null);
  const [agentPrompt, setAgentPrompt] = useState('查找 formatUser 并读取相关文件');
  const [agentEvents, setAgentEvents] = useState<AgentRunEvent[]>([]);
  const [agentRunning, setAgentRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<AgentRunId | null>(null);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [sessionLog, setSessionLog] = useState<SessionLogResponse | null>(null);
  const [events, setEvents] = useState<AgentShellEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stopAgentStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void Promise.all([api.health(), api.workspace(), api.workspaceTree(), api.tools()])
      .then(([healthResult, workspaceResult, treeResult, toolResult]) => {
        setHealth(healthResult);
        setWorkspace(workspaceResult);
        setTree(treeResult);
        setTools(toolResult.tools);
        const first = findFirstFile(treeResult);
        if (first) {
          void openFile(first.path);
        }
      })
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

  async function createSession() {
    setError(null);
    const result = await api.createSession('Phase 6 Patch Preview');
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

  async function openFile(path: string) {
    setError(null);
    const result = await api.readWorkspaceFile(path);
    setSelectedFile(result);
    setPatchDraft(result.content);
    setPatchProposal(null);
  }

  async function createPatchPreview() {
    if (!selectedFile) return;
    setError(null);
    try {
      const activeSession = session ?? (await api.createSession('Phase 6 Patch Preview')).session;
      setSession(activeSession);
      const result = await api.createPatchPreview({
        sessionId: activeSession.id,
        path: selectedFile.path,
        updatedContent: patchDraft,
      });
      setPatchProposal(result.proposal);
      await refreshSessionLog(activeSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function discardPatch() {
    if (!patchProposal) return;
    setError(null);
    try {
      const result = await api.discardPatch(patchProposal.id);
      setPatchProposal(result.proposal);
      await refreshSessionLog();
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

  async function runAgent() {
    setError(null);
    setAgentEvents([]);
    setAgentRunning(true);
    setCurrentRunId(null);
    try {
      const activeSession = session ?? (await api.createSession('Phase 6 Patch Preview')).session;
      setSession(activeSession);
      stopAgentStreamRef.current = api.runAgent(
        { sessionId: activeSession.id, message: agentPrompt, maxIterations: 6 },
        (event) => {
          setAgentEvents((current) => [...current, event]);
          if (event.type === 'agent.run_created') {
            setSession(event.session);
            setCurrentRunId(event.run.id);
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 6</p>
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
            <p>Patch Engine 会基于当前文件和草稿内容生成 proposed diff。</p>
            <p>Phase 6 只做 Diff Preview 和 patch history，不写入文件。</p>
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
              disabled={!patchProposal || patchProposal.status === 'discarded'}
              onClick={() => void discardPatch()}
            >
              丢弃 Patch Proposal
            </button>
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
            </ul>
          </div>
        </aside>

        <section className="panel bottom-panel">
          <div className="panel-header">
            <span>Terminal / Command Log / Trace Log</span>
            <small>Phase 8 和 Phase 15 扩展</small>
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
    case 'agent.message':
      return `assistant ${event.content}`;
    case 'agent.tool_call':
      return `tool_call ${event.call.name} ${JSON.stringify(event.call.input)}`;
    case 'agent.tool_result':
      return `tool_result ${event.result.name} ok=${event.result.ok}`;
    case 'agent.error':
      return `agent.error ${event.message}`;
    case 'agent.done':
      return `agent.done ${event.finishReason}`;
  }
}
