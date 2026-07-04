import type {
  AgentRunEvent,
  AgentRunRequest,
  AgentRunId,
  AgentShellEvent,
  CreatePatchPreviewRequest,
  CreatePatchPreviewResponse,
  CreateAgentSessionResponse,
  HealthResponse,
  PatchProposal,
  ReadWorkspaceFileResponse,
  SearchTextResponse,
  SessionLogResponse,
  ToolCallRequest,
  ToolListResponse,
  ToolResult,
  WorkspaceFileNode,
  WorkspaceInfo,
} from '@wac/shared';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch('/api/health').then(json<HealthResponse>),
  workspace: () => fetch('/api/workspace').then(json<WorkspaceInfo>),
  workspaceTree: () => fetch('/api/workspace/tree').then(json<WorkspaceFileNode>),
  readWorkspaceFile: (path: string) =>
    fetch(`/api/workspace/file?path=${encodeURIComponent(path)}`).then(
      json<ReadWorkspaceFileResponse>,
    ),
  searchWorkspace: (query: string) =>
    fetch(`/api/workspace/search?q=${encodeURIComponent(query)}`).then(json<SearchTextResponse>),
  tools: () => fetch('/api/tools').then(json<ToolListResponse>),
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
