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
  phase:
    | 'phase-01-web-server-shell'
    | 'phase-02-workspace-filesystem'
    | 'phase-03-tool-system';
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

export interface WorkspaceInfo {
  rootName: string;
}

export interface ReadWorkspaceFileResponse {
  path: string;
  content: string;
}

export interface SearchTextMatch {
  path: string;
  line: number;
  column: number;
  snippet: string;
}

export interface SearchTextResponse {
  query: string;
  matches: SearchTextMatch[];
}

export type JsonSchemaType = 'object' | 'string' | 'number' | 'boolean' | 'array';

export interface JsonSchema {
  type: JsonSchemaType;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  minLength?: number;
}

export type ToolPermission = 'read_only' | 'write_patch' | 'execute_safe' | 'execute_risky' | 'forbidden';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: JsonSchema;
  permission: ToolPermission;
}

export interface ToolCallRequest {
  name: string;
  input: unknown;
}

export interface ToolResult {
  ok: boolean;
  name: string;
  permission: ToolPermission;
  output?: unknown;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

export interface ToolCallTrace {
  name: string;
  permission: ToolPermission;
  input: unknown;
  ok: boolean;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

export interface ToolListResponse {
  tools: ToolDefinition[];
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

export interface PlanStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'done';
}

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
export function sseFrame(event: AgentShellEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
