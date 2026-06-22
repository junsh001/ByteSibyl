import { create } from 'zustand';
import type { AgentEvent, FileNode, Lesson, LessonProgress, Locale, ToolName } from '@wac/shared';
import { api, streamAgent, type StoredMessage } from './api';
import { getLocale, setLocale } from './i18n';

export interface ToolEntry {
  id: string;
  name: ToolName;
  args: Record<string, unknown>;
  status: 'running' | 'ok' | 'fail';
  summary?: string;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reasoning: string;
  tools: ToolEntry[];
  status: 'streaming' | 'done';
}

interface State {
  locale: Locale;
  ready: boolean;
  hasKey: boolean;
  model: string;
  projectId: string;

  files: FileNode | null;
  openPath: string | null;
  openContent: string;
  dirty: boolean;

  chat: ChatTurn[];
  running: boolean;
  phase: 'idle' | 'thinking' | 'acting';
  mode: 'agent' | 'ask';
  reasoning: boolean;
  abort: (() => void) | null;

  view: 'code' | 'learn';
  lessons: Lesson[];
  progress: LessonProgress[];
  xp: number;

  terminalSink: ((s: string) => void) | null;

  // actions
  init: () => Promise<void>;
  toggleLocale: () => void;
  setView: (v: 'code' | 'learn') => void;
  setMode: (m: 'agent' | 'ask') => void;
  setReasoning: (b: boolean) => void;
  refreshFiles: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  setOpenContent: (c: string) => void;
  saveFile: () => Promise<void>;
  send: (message: string) => void;
  stop: () => void;
  runCommand: (command: string) => Promise<void>;
  registerTerminal: (sink: ((s: string) => void) | null) => void;
  loadLessons: () => Promise<void>;
  checkTask: (
    lessonId: string,
    taskId: string,
  ) => Promise<Awaited<ReturnType<typeof api.checkTask>>>;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useStore = create<State>((set, get) => ({
  locale: getLocale(),
  ready: false,
  hasKey: false,
  model: '',
  projectId: '',
  files: null,
  openPath: null,
  openContent: '',
  dirty: false,
  chat: [],
  running: false,
  phase: 'idle',
  mode: 'agent',
  reasoning: false,
  abort: null,
  view: 'code',
  lessons: [],
  progress: [],
  xp: 0,
  terminalSink: null,

  async init() {
    const [health, project] = await Promise.all([api.health(), api.defaultProject()]);
    set({ hasKey: health.hasKey, model: health.model, projectId: project.id });
    const stored: StoredMessage[] = await api.messages(project.id);
    const chat: ChatTurn[] = stored.map((m) => ({
      id: m.id,
      role: m.role === 'assistant' ? 'assistant' : 'user',
      text: m.content,
      reasoning: '',
      tools: [],
      status: 'done',
    }));
    set({ chat, ready: true });
    await get().refreshFiles();
    await get().loadLessons();
  },

  toggleLocale() {
    const next: Locale = get().locale === 'zh' ? 'en' : 'zh';
    setLocale(next);
    set({ locale: next });
  },

  setView: (view) => set({ view }),
  setMode: (mode) => set({ mode }),
  setReasoning: (reasoning) => set({ reasoning }),

  async refreshFiles() {
    const files = await api.files(get().projectId);
    set({ files });
  },

  async openFile(path) {
    const { content } = await api.readFile(get().projectId, path);
    set({ openPath: path, openContent: content, dirty: false });
  },

  setOpenContent: (c) => set({ openContent: c, dirty: true }),

  async saveFile() {
    const { projectId, openPath, openContent } = get();
    if (!openPath) return;
    await api.writeFile(projectId, openPath, openContent);
    set({ dirty: false });
    await get().refreshFiles();
  },

  send(message) {
    const { projectId, running, mode, reasoning } = get();
    if (running || !message.trim()) return;

    const userTurn: ChatTurn = {
      id: uid(),
      role: 'user',
      text: message,
      reasoning: '',
      tools: [],
      status: 'done',
    };
    const assistantTurn: ChatTurn = {
      id: uid(),
      role: 'assistant',
      text: '',
      reasoning: '',
      tools: [],
      status: 'streaming',
    };
    set((s) => ({ chat: [...s.chat, userTurn, assistantTurn], running: true, phase: 'thinking' }));

    const patchAssistant = (fn: (t: ChatTurn) => ChatTurn) =>
      set((s) => ({
        chat: s.chat.map((t) => (t.id === assistantTurn.id ? fn(t) : t)),
      }));

    const onEvent = (e: AgentEvent) => {
      switch (e.type) {
        case 'status':
          set({ phase: e.phase });
          break;
        case 'token':
          patchAssistant((t) => ({ ...t, text: t.text + e.text }));
          break;
        case 'reasoning':
          patchAssistant((t) => ({ ...t, reasoning: t.reasoning + e.text }));
          break;
        case 'tool_call':
          patchAssistant((t) => ({
            ...t,
            tools: [...t.tools, { id: e.id, name: e.name, args: e.args, status: 'running' }],
          }));
          break;
        case 'tool_result':
          patchAssistant((t) => ({
            ...t,
            tools: t.tools.map((tl) =>
              tl.id === e.id ? { ...tl, status: e.ok ? 'ok' : 'fail', summary: e.summary } : tl,
            ),
          }));
          break;
        case 'file_change':
          void get().refreshFiles();
          if (get().openPath === e.path) void get().openFile(e.path);
          else if (e.action === 'create') void get().openFile(e.path);
          break;
        case 'error':
          patchAssistant((t) => ({ ...t, text: t.text + `\n\n> ⚠ ${e.message}` }));
          break;
        case 'done':
          break;
      }
    };
    const onDone = () => {
      patchAssistant((t) => ({ ...t, status: 'done' }));
      set({ running: false, phase: 'idle', abort: null });
      void get().refreshFiles();
    };

    const abort = streamAgent(projectId, { projectId, message, reasoning, mode }, onEvent, onDone);
    set({ abort });
  },

  stop() {
    get().abort?.();
    set({ running: false, phase: 'idle', abort: null });
  },

  async runCommand(command) {
    const sink = get().terminalSink;
    sink?.(`\x1b[36m$ ${command}\x1b[0m\r\n`);
    try {
      const r = await api.run(get().projectId, command);
      if (r.stdout) sink?.(r.stdout.replace(/\n/g, '\r\n'));
      if (r.stderr) sink?.(`\x1b[31m${r.stderr.replace(/\n/g, '\r\n')}\x1b[0m`);
      if (r.timedOut) sink?.(`\x1b[33m[timed out]\x1b[0m\r\n`);
      sink?.(`\x1b[90m[exit ${r.exitCode ?? '?'}]\x1b[0m\r\n`);
      await get().refreshFiles();
    } catch (err) {
      sink?.(`\x1b[31m${(err as Error).message}\x1b[0m\r\n`);
    }
  },

  registerTerminal: (terminalSink) => set({ terminalSink }),

  async loadLessons() {
    const { lessons, progress, xp } = await api.lessons();
    set({ lessons, progress, xp });
  },

  async checkTask(lessonId, taskId) {
    const res = await api.checkTask(lessonId, taskId, get().projectId);
    await get().loadLessons();
    await get().refreshFiles();
    return res;
  },
}));
