import { useMemo, useState } from 'react';
import type { FileEditTrace, SessionTraceExport, TraceTimelineEntry } from '@wac/shared';

export function TraceViewer({ trace }: { trace: SessionTraceExport | null }) {
  const [cursor, setCursor] = useState(0);
  const timeline = trace?.timeline ?? [];
  const active = timeline[Math.min(cursor, Math.max(0, timeline.length - 1))] ?? null;
  const fileEdit = active?.kind === 'file_edit' ? (active.data as FileEditTrace) : null;
  const stats = useMemo(() => {
    if (!trace) return { model: 0, tools: 0, files: 0, commands: 0, approvals: 0 };
    return {
      model: trace.modelCalls.length,
      tools: trace.toolCalls.length,
      files: trace.fileEdits.length,
      commands: trace.commands.length,
      approvals: trace.approvals.length,
    };
  }, [trace]);

  function move(delta: number) {
    setCursor((current) => Math.min(Math.max(current + delta, 0), Math.max(0, timeline.length - 1)));
  }

  function exportTrace() {
    if (!trace) return;
    const blob = new Blob([`${JSON.stringify(trace, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${trace.session.id}-trace.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="trace-viewer">
      <div className="trace-header">
        <div>
          <div className="todo-title">Trace Replay</div>
          <small>
            {trace
              ? `${timeline.length} events · generated ${new Date(trace.generatedAt).toLocaleTimeString()}`
              : '创建 Session 后刷新 Trace'}
          </small>
        </div>
        <button type="button" disabled={!trace} onClick={exportTrace}>
          导出 JSON
        </button>
      </div>

      <div className="trace-stats">
        <TraceStat label="Model" value={stats.model} />
        <TraceStat label="Tools" value={stats.tools} />
        <TraceStat label="Files" value={stats.files} />
        <TraceStat label="Commands" value={stats.commands} />
        <TraceStat label="Approvals" value={stats.approvals} />
      </div>

      <div className="replay-controls">
        <button type="button" disabled={cursor <= 0} onClick={() => move(-1)}>
          上一步
        </button>
        <span>
          {timeline.length === 0 ? '0/0' : `${Math.min(cursor + 1, timeline.length)}/${timeline.length}`}
        </span>
        <button type="button" disabled={cursor >= timeline.length - 1} onClick={() => move(1)}>
          下一步
        </button>
      </div>

      <div className="trace-content">
        <div className="trace-timeline">
          {timeline.length === 0 ? (
            <div className="trace-empty">暂无 trace。运行 Agent、命令或 Patch 流程后刷新。</div>
          ) : (
            timeline.map((entry, index) => (
              <button
                type="button"
                key={entry.id}
                className={index === cursor ? `trace-entry ${entry.kind} selected` : `trace-entry ${entry.kind}`}
                onClick={() => setCursor(index)}
              >
                <span>{entry.kind}</span>
                <strong>{entry.title}</strong>
                <small>{formatTime(entry.timestamp)}</small>
              </button>
            ))
          )}
        </div>

        <div className="trace-detail">
          {active ? (
            <>
              <div className="trace-detail-heading">
                <span>{active.kind}</span>
                <strong>{active.status ?? 'recorded'}</strong>
              </div>
              <h3>{active.title}</h3>
              <p>{active.summary}</p>
              {active.kind === 'command' ? (
                <div className="trace-evidence">
                  <EvidenceRow label="Exit code" value={commandValue(active, 'exitCode')} />
                  <EvidenceRow label="Duration" value={`${commandValue(active, 'durationMs')}ms`} />
                </div>
              ) : null}
              {fileEdit ? (
                <div className="file-evidence">
                  <EvidenceBlock title="Before" lines={fileEdit.before.sample} />
                  <EvidenceBlock title="After" lines={fileEdit.after.sample} />
                </div>
              ) : null}
              <pre>{JSON.stringify(active.data, null, 2)}</pre>
            </>
          ) : (
            <div className="trace-empty">选择一条 trace 查看详情。</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TraceStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="state-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EvidenceBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <strong>{title}</strong>
      <pre>{lines.length === 0 ? '<empty>' : lines.join('\n')}</pre>
    </div>
  );
}

function commandValue(entry: TraceTimelineEntry, key: 'exitCode' | 'durationMs'): string {
  const data = entry.data as Record<string, unknown>;
  const value = data[key];
  return value === undefined ? 'n/a' : String(value);
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString();
}
