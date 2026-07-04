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
    | 'phase-03-tool-system'
    | 'phase-04-agent-loop'
    | 'phase-05-session-state'
    | 'phase-06-patch-engine';
  timestamp: string;
}

export type AgentSessionStatus =
  | 'created'
  | 'running'
  | 'paused'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentSession {
  id: SessionId;
  title: string;
  status: AgentSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentSessionRequest {
  title?: string;
}

export interface CreateAgentSessionResponse {
  session: AgentSession;
}

export type AgentRunId = string;

export type AgentRunStatus =
  | 'created'
  | 'running'
  | 'paused'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentRunStepType =
  | 'model_call'
  | 'tool_call'
  | 'tool_result'
  | 'approval'
  | 'final'
  | 'status'
  | 'error';

export interface AgentRunStep {
  id: string;
  runId: AgentRunId;
  type: AgentRunStepType;
  title: string;
  event?: AgentRunEvent;
  createdAt: string;
}

export interface AgentRunRecord {
  id: AgentRunId;
  sessionId: SessionId;
  message: string;
  status: AgentRunStatus;
  createdAt: string;
  updatedAt: string;
  events: AgentRunEvent[];
  steps: AgentRunStep[];
}

export interface SessionLogResponse {
  session: AgentSession;
  runs: AgentRunRecord[];
  patches: PatchProposal[];
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

export type PatchProposalId = string;

export type PatchProposalStatus = 'proposed' | 'discarded';

export type PatchLineType = 'context' | 'add' | 'remove';

export interface PatchLine {
  type: PatchLineType;
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface PatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: PatchLine[];
}

export interface PatchProposal {
  id: PatchProposalId;
  sessionId?: SessionId;
  path: string;
  status: PatchProposalStatus;
  additions: number;
  deletions: number;
  oldLineCount: number;
  newLineCount: number;
  hunks: PatchHunk[];
  unifiedDiff: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatchPreviewRequest {
  sessionId?: SessionId;
  path: string;
  updatedContent: string;
}

export interface CreatePatchPreviewResponse {
  proposal: PatchProposal;
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

export type ModelMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ModelMessage {
  role: ModelMessageRole;
  content: string;
  toolName?: string;
}

export interface ModelRequest {
  messages: ModelMessage[];
  tools: ToolDefinition[];
}

export interface ModelResponse {
  content?: string;
  toolCalls?: ToolCallRequest[];
  final?: boolean;
}

export interface AgentRunRequest {
  sessionId?: SessionId;
  message: string;
  maxIterations?: number;
}

export type AgentRunEvent =
  | {
      type: 'agent.run_created';
      session: AgentSession;
      run: AgentRunRecord;
    }
  | {
      type: 'agent.status';
      status: AgentRunStatus;
      message: string;
    }
  | {
      type: 'agent.iteration';
      iteration: number;
      maxIterations: number;
    }
  | {
      type: 'agent.message';
      role: 'assistant';
      content: string;
    }
  | {
      type: 'agent.tool_call';
      call: ToolCallRequest;
    }
  | {
      type: 'agent.tool_result';
      result: ToolResult;
    }
  | {
      type: 'agent.error';
      message: string;
    }
  | {
      type: 'agent.done';
      finishReason: 'final' | 'stop' | 'max_iterations' | 'error' | 'cancelled';
    };

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
export function sseFrame(event: AgentShellEvent | AgentRunEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
