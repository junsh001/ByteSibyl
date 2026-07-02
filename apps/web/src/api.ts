import type {
  AgentShellEvent,
  CreateAgentSessionResponse,
  HealthResponse,
} from '@wac/shared';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetch('/api/health').then(json<HealthResponse>),
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
