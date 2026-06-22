import type {
  AgentEvent,
  AgentRunRequest,
  FileNode,
  Lesson,
  LessonProgress,
} from '@wac/shared';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text().catch(() => '')) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}
export interface StoredMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export const api = {
  health: () => fetch('/api/health').then(json<{ ok: boolean; hasKey: boolean; model: string }>),
  defaultProject: () => fetch('/api/projects/default').then(json<Project>),
  createProject: (name?: string) =>
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(json<Project>),
  listProjects: () => fetch('/api/projects').then(json<Project[]>),
  files: (pid: string) => fetch(`/api/projects/${pid}/files`).then(json<FileNode>),
  readFile: (pid: string, path: string) =>
    fetch(`/api/projects/${pid}/file?path=${encodeURIComponent(path)}`).then(
      json<{ path: string; content: string }>,
    ),
  writeFile: (pid: string, path: string, content: string) =>
    fetch(`/api/projects/${pid}/file`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    }).then(json<{ ok: boolean }>),
  messages: (pid: string) => fetch(`/api/projects/${pid}/messages`).then(json<StoredMessage[]>),
  run: (pid: string, command: string) =>
    fetch(`/api/projects/${pid}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    }).then(json<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }>),
  lessons: () =>
    fetch('/api/lessons').then(json<{ lessons: Lesson[]; progress: LessonProgress[]; xp: number }>),
  checkTask: (lessonId: string, taskId: string, projectId: string) =>
    fetch(`/api/lessons/${lessonId}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, projectId }),
    }).then(
      json<{
        passed: boolean;
        feedback: string;
        lessonCompleted?: boolean;
        unlockedLessonId?: string;
        xp?: number;
      }>,
    ),
};

/**
 * Stream the agent over SSE. Calls `onEvent` for each AgentEvent. Returns an
 * abort function.
 */
export function streamAgent(
  projectId: string,
  body: AgentRunRequest,
  onEvent: (e: AgentEvent) => void,
  onDone: () => void,
): () => void {
  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => `HTTP ${res.status}`);
        onEvent({ type: 'error', message: msg });
        onDone();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split('\n\n');
        buf = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith('data:')) continue;
          try {
            onEvent(JSON.parse(line.slice(5).trim()) as AgentEvent);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onEvent({ type: 'error', message: (err as Error).message });
      }
    } finally {
      onDone();
    }
  })();
  return () => controller.abort();
}
