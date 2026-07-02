/**
 * @wac/shared — the wire contract shared by the web client, the HTTP server,
 * and the agent runtime packages. Keep this dependency-free.
 */

// ---------------------------------------------------------------------------
// Phase 1: Web + Server shell contracts
// ---------------------------------------------------------------------------

export type SessionId = string;

export interface HealthResponse {
  ok: boolean;
  service: 'web-ai-coding-agent-lab';
  phase: 'phase-01-web-server-shell';
  timestamp: string;
}

export type AgentSessionStatus = 'created' | 'idle';

export interface AgentSession {
  id: SessionId;
  title: string;
  status: AgentSessionStatus;
  createdAt: string;
}

export interface CreateAgentSessionRequest {
  title?: string;
}

export interface CreateAgentSessionResponse {
  session: AgentSession;
}

export interface WorkspaceFileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: WorkspaceFileNode[];
}

export type AgentShellEvent =
  | {
      type: 'session.created';
      session: AgentSession;
    }
  | {
      type: 'session.connected';
      sessionId: SessionId;
      message: string;
      timestamp: string;
    }
  | {
      type: 'log.appended';
      sessionId: SessionId;
      level: 'info' | 'warn' | 'error';
      message: string;
      timestamp: string;
    };

// ---------------------------------------------------------------------------
// Agent streaming protocol (server -> client over SSE).
// Each SSE `data:` line carries exactly one JSON-encoded AgentEvent.
// ---------------------------------------------------------------------------

export type ToolName =
  | 'list_dir'
  | 'read_file'
  | 'write_file'
  | 'edit_file'
  | 'search'
  | 'run'
  | 'finish';

export type FileAction = 'create' | 'update' | 'delete';

export interface PlanStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'done';
}

export type AgentEvent =
  /** A high-level lifecycle signal for the UI status line. */
  | { type: 'status'; phase: 'thinking' | 'acting' | 'idle'; text?: string }
  /** Assistant natural-language text delta. */
  | { type: 'token'; text: string }
  /** Reasoning/chain-of-thought delta (only for reasoner models). */
  | { type: 'reasoning'; text: string }
  /** The model decided to call a tool. */
  | { type: 'tool_call'; id: string; name: ToolName; args: Record<string, unknown> }
  /** Result of a tool call. `summary` is a short human string for the UI. */
  | {
      type: 'tool_result';
      id: string;
      name: ToolName;
      ok: boolean;
      summary: string;
      result?: unknown;
    }
  /** A file in the workspace changed (used to refresh the editor/file tree). */
  | { type: 'file_change'; path: string; action: FileAction; diff?: string }
  /** The agent's current plan (todo list). */
  | { type: 'plan'; steps: PlanStep[] }
  /** Token usage accounting for the turn. */
  | { type: 'usage'; promptTokens: number; completionTokens: number }
  /** A recoverable or fatal error. */
  | { type: 'error'; message: string }
  /** Turn finished. */
  | { type: 'done'; finishReason: string };

// ---------------------------------------------------------------------------
// Client -> server request bodies
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AgentRunRequest {
  projectId: string;
  /** The user's instruction for this turn. */
  message: string;
  /** Prior conversation (excluding the new message). */
  history?: ChatMessage[];
  /** Use the reasoning model for harder tasks. */
  reasoning?: boolean;
  /** Optional: restrict the agent to plan-only (no file writes / no run). */
  mode?: 'agent' | 'ask';
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface FileNode {
  name: string;
  path: string; // relative to project root, POSIX style
  type: 'file' | 'dir';
  children?: FileNode[];
}

// ---------------------------------------------------------------------------
// Tutorial / game
// ---------------------------------------------------------------------------

export interface LessonTask {
  id: string;
  /** Markdown prompt shown to the learner (bilingual handled at content level). */
  instruction: string;
  /** A short hint, revealed on demand. */
  hint?: string;
  /**
   * How this task is checked. `llm` => an AI rubric grades the learner's work;
   * `contains` => the learner's file/answer must contain all `needles`.
   */
  check:
    | { kind: 'llm'; rubric: string }
    | { kind: 'contains'; target: string; needles: string[] }
    | { kind: 'manual' };
}

export interface Lesson {
  id: string;
  /** Ordering within the track. */
  order: number;
  concept: 'prompt' | 'tool-use' | 'skills' | 'mcp' | 'agent';
  title: { zh: string; en: string };
  summary: { zh: string; en: string };
  /** Estimated minutes. */
  minutes: number;
  /** Markdown lesson body (bilingual blocks). */
  body: { zh: string; en: string };
  /** Hands-on tasks; completing all unlocks the next lesson. */
  tasks: LessonTask[];
  /** XP awarded on completion. */
  xp: number;
}

export interface LessonProgress {
  lessonId: string;
  status: 'locked' | 'available' | 'completed';
  completedTaskIds: string[];
}

export type Locale = 'zh' | 'en';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialize a server event as an SSE frame. */
export function sseFrame(event: AgentEvent | AgentShellEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
