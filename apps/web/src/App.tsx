import { useEffect, useMemo, useState } from 'react';
import type { AgentSession, AgentShellEvent, HealthResponse } from '@wac/shared';
import { api, connectSessionEvents } from './api';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [events, setEvents] = useState<AgentShellEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .health()
      .then(setHealth)
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
    return `${session.title} · ${session.id.slice(0, 8)}`;
  }, [session]);

  async function createSession() {
    setError(null);
    const result = await api.createSession('Phase 1 Web Shell');
    setSession(result.session);
    setEvents([{ type: 'session.created', session: result.session }]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 1</p>
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
            <span>Workspace</span>
            <small>Phase 2 接入真实文件树</small>
          </div>
          <div className="placeholder-list">
            <div className="tree-row folder">examples</div>
            <div className="tree-row file">buggy-ts-project</div>
            <div className="tree-row file">README.md</div>
          </div>
        </aside>

        <section className="panel editor">
          <div className="panel-header">
            <span>Editor</span>
            <small>Monaco 容器占位</small>
          </div>
          <div className="editor-placeholder">
            <div className="line-number">1</div>
            <pre>{`// Phase 1 只搭建 Web IDE 壳子
// 文件读取、编辑和诊断会在后续阶段接入

export const goal = 'show the agent workspace shell';`}</pre>
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
            <p>输入框和 Agent Loop 会在 Phase 4 接入。</p>
            <p>当前阶段只验证 session 创建和事件通道。</p>
          </div>
          <div className="todo-box">
            <div className="todo-title">Todo Plan</div>
            <ul>
              <li className="done">Web IDE 五区布局</li>
              <li className={session ? 'done' : ''}>创建 Session</li>
              <li>等待后续阶段接入工具与 Agent Loop</li>
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
              <div className="log-line muted">等待 session 事件...</div>
            ) : (
              events.map((event, index) => (
                <div className="log-line" key={`${event.type}-${index}`}>
                  {event.type === 'session.created'
                    ? `session.created ${event.session.id}`
                    : `${event.type} ${event.message}`}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <div className="diff-modal-placeholder" aria-label="Diff Preview placeholder">
        Diff Preview + Approval 占位，Phase 6/7 接入。
      </div>
    </div>
  );
}
