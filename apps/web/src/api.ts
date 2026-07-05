import type {
  AgentRunEvent,
  AgentRunRequest,
  AgentRunId,
  AgentShellEvent,
  ApplyPatchResponse,
  DecidePatchApprovalResponse,
  CreatePatchPreviewRequest,
  CreatePatchPreviewResponse,
  CreateAgentSessionResponse,
  DiagnosticsResponse,
  EvalRunResponse,
  EvalTaskListResponse,
  HealthResponse,
  ModelProviderStatusResponse,
  PatchProposal,
  ReadWorkspaceFileResponse,
  RequestPatchApprovalResponse,
  SearchTextResponse,
  ShellCommandRequest,
  ShellCommandResponse,
  SkillListResponse,
  StartSelfRepairRequest,
  StartSelfRepairResponse,
  SessionLogResponse,
  SessionTraceExport,
  ToolCallRequest,
  ToolListResponse,
  ToolResult,
  TodoListResponse,
  VerifySelfRepairRequest,
  VerifySelfRepairResponse,
  WorkspaceFileNode,
  WorkspaceInfo,
} from '@wac/shared';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch('/api/health').then(json<HealthResponse>),
  modelProviderStatus: () =>
    fetch('/api/model-provider/status').then(json<ModelProviderStatusResponse>),
  workspace: () => fetch('/api/workspace').then(json<WorkspaceInfo>),
  workspaceTree: () => fetch('/api/workspace/tree').then(json<WorkspaceFileNode>),
  diagnostics: () => fetch('/api/diagnostics').then(json<DiagnosticsResponse>),
  evalTasks: () => fetch('/api/eval/tasks').then(json<EvalTaskListResponse>),
  runEval: () => fetch('/api/eval/run', { method: 'POST' }).then(json<EvalRunResponse>),
  readWorkspaceFile: (path: string) =>
    fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`).then(
      json<ReadWorkspaceFileResponse>,
    ),
  searchWorkspace: (query: string) =>
    fetch(`/api/workspace/search?q=${encodeURIComponent(query)}`).then(json<SearchTextResponse>),
  tools: () => fetch('/api/tools').then(json<ToolListResponse>),
  skills: () => fetch('/api/skills').then(json<SkillListResponse>),
  todos: () => fetch('/api/todos').then(json<TodoListResponse>),
  runTool: (request: ToolCallRequest) =>
    fetch('/api/tools/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(json<ToolResult>),
  runAgent: (
    request: AgentRunRequest,
    onEvent: (event: AgentRunEvent) => void,
    onError: (message: string) => void,
  ) => streamSse('/api/agent/run', request, onEvent, onError),
  cancelRun: (runId: AgentRunId) =>
    fetch(`/api/agent/runs/${runId}/cancel`, { method: 'POST' }).then(
      json<{ run: unknown }>,
    ),
  sessionLog: (sessionId: string) =>
    fetch(`/api/sessions/${sessionId}/log`).then(json<SessionLogResponse>),
  sessionTrace: (sessionId: string) =>
    fetch(`/api/sessions/${sessionId}/trace`).then(json<SessionTraceExport>),
  createPatchPreview: (request: CreatePatchPreviewRequest) =>
    fetch('/api/patches/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(json<CreatePatchPreviewResponse>),
  discardPatch: (id: string) =>
    fetch(`/api/patches/${id}/discard`, { method: 'POST' }).then(
      json<{ proposal: PatchProposal }>,
    ),
  requestPatchApproval: (id: string) =>
    fetch(`/api/patches/${id}/request-approval`, { method: 'POST' }).then(
      json<RequestPatchApprovalResponse>,
    ),
  approvePatch: (approvalId: string) =>
    fetch(`/api/approvals/${approvalId}/approve`, { method: 'POST' }).then(
      json<DecidePatchApprovalResponse>,
    ),
  rejectPatch: (approvalId: string) =>
    fetch(`/api/approvals/${approvalId}/reject`, { method: 'POST' }).then(
      json<DecidePatchApprovalResponse>,
    ),
  applyPatch: (id: string) =>
    fetch(`/api/patches/${id}/apply`, { method: 'POST' }).then(json<ApplyPatchResponse>),
  runShellCommand: (request: ShellCommandRequest) =>
    fetch('/api/shell/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(json<ShellCommandResponse>),
  startSelfRepair: (request: StartSelfRepairRequest) =>
    fetch('/api/self-repair/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(json<StartSelfRepairResponse>),
  verifySelfRepair: (request: VerifySelfRepairRequest) =>
    fetch('/api/self-repair/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }).then(json<VerifySelfRepairResponse>),
  createSession: (title?: string) =>
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then(json<CreateAgentSessionResponse>),
};

export function connectSessionEvents(
  sessionId: string,
  onEvent: (event: AgentShellEvent) => void,
  onError: (message: string) => void,
): () => void {
  const source = new EventSource(`/api/sessions/${sessionId}/events`);
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as AgentShellEvent);
    } catch {
      onError('无法解析服务器事件。');
    }
  };
  source.onerror = () => {
    source.close();
  };
  return () => source.close();
}

function streamSse<TEvent>(
  url: string,
  body: unknown,
  onEvent: (event: TEvent) => void,
  onError: (message: string) => void,
): () => void {
  const controller = new AbortController();
  void (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith('data:')) continue;
          onEvent(JSON.parse(line.slice(5).trim()) as TEvent);
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        onError(err instanceof Error ? err.message : String(err));
      }
    }
  })();

  return () => controller.abort();
}
