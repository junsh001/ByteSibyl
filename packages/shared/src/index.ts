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
    | 'phase-06-patch-engine'
    | 'phase-07-permission-approval-guardrails'
    | 'phase-08-shell-runner'
    | 'phase-09-self-repair-loop'
    | 'phase-10-model-provider-integration'
    | 'phase-11-lsp-diagnostics'
    | 'phase-12-context-engine'
    | 'phase-13-todo-planner'
    | 'phase-14-skills'
    | 'phase-15-hooks'
    | 'phase-16-trace-replay-observability'
    | 'phase-17-evaluation'
    | 'phase-18-subagents'
    | 'phase-19-engineering-route'
    | 'product-phase-01-project-workspace-git-isolation'
    | 'product-phase-02-real-web-ide-editing'
    | 'product-phase-03-05-task-workflow';
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
  | 'context_summary'
  | 'todo'
  | 'skill'
  | 'subagent'
  | 'hook'
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
  approvals: ApprovalRequest[];
  commands: ShellCommandResult[];
  repairs: SelfRepairAttempt[];
  modelCalls: ModelCallRecord[];
  hooks: HookRecord[];
  tasks?: ProductTask[];
  memories?: MemoryRecord[];
  page?: PageInfo;
}

export interface PageInfo {
  limit: number;
  offset: number;
  totalRuns: number;
  totalEvents: number;
}

export type TraceEntryKind =
  | 'session'
  | 'agent_event'
  | 'model_call'
  | 'tool_call'
  | 'tool_result'
  | 'file_edit'
  | 'command'
  | 'approval'
  | 'hook';

export interface TraceTimelineEntry {
  id: string;
  sessionId: SessionId;
  runId?: AgentRunId;
  kind: TraceEntryKind;
  title: string;
  summary: string;
  status?: string;
  refId?: string;
  timestamp: string;
  data: unknown;
}

export interface ModelCallTrace {
  id: string;
  sessionId?: SessionId;
  runId?: AgentRunId;
  provider: ModelProviderKind;
  model: string;
  status: ModelCallStatus;
  latencyMs: number;
  usage?: ModelUsage;
  requestSummary: string;
  responseSummary?: string;
  error?: string;
  timestamp: string;
}

export interface FileEditEvidence {
  lineCount: number;
  sample: string[];
}

export interface FileEditTrace {
  id: PatchProposalId;
  sessionId?: SessionId;
  path: string;
  status: PatchProposalStatus;
  additions: number;
  deletions: number;
  before: FileEditEvidence;
  after: FileEditEvidence;
  unifiedDiff: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommandTrace {
  id: string;
  sessionId?: SessionId;
  command: string;
  argv: string[];
  cwd: string;
  safety: ShellCommandSafety;
  status: ShellCommandStatus;
  exitCode?: number;
  durationMs: number;
  stdoutSummary: string;
  stderrSummary: string;
  startedAt: string;
  finishedAt: string;
}

export interface ApprovalTrace {
  id: ApprovalRequestId;
  sessionId: SessionId;
  action: PermissionActionKind;
  subjectId: string;
  permission: ToolPermission;
  status: ApprovalStatus;
  reason: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
}

export interface SessionTraceExport {
  session: AgentSession;
  generatedAt: string;
  timeline: TraceTimelineEntry[];
  modelCalls: ModelCallTrace[];
  toolCalls: ToolCallTrace[];
  fileEdits: FileEditTrace[];
  commands: CommandTrace[];
  approvals: ApprovalTrace[];
  hooks: HookRecord[];
  page?: TracePageInfo;
}

export interface TracePageInfo {
  limit: number;
  offset: number;
  total: number;
}

export interface EvalTask {
  id: string;
  workspace: string;
  prompt: string;
  successCommands: string[];
  forbiddenFiles: string[];
  maxChangedFiles: number;
}

export interface EvalTaskResult {
  id: string;
  passed: boolean;
  successRate: number;
  changedFilesCount: number;
  commandCount: number;
  toolCallCount: number;
  approvalCount: number;
  runtimeSeconds: number;
  forbiddenActionCount: number;
  forbiddenFilesModified: string[];
  commandResults: Pick<ShellCommandResult, 'command' | 'status' | 'exitCode' | 'durationMs'>[];
  errors: string[];
}

export interface EvalReport {
  generatedAt: string;
  taskCount: number;
  passedCount: number;
  metrics: {
    success_rate: number;
    changed_files_count: number;
    command_count: number;
    tool_call_count: number;
    approval_count: number;
    runtime_seconds: number;
    forbidden_action_count: number;
  };
  results: EvalTaskResult[];
}

export interface EvalTaskListResponse {
  tasks: EvalTask[];
}

export interface EvalRunResponse {
  report: EvalReport;
}

export interface WorkspaceFileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: WorkspaceFileNode[];
}

export interface WorkspaceInfo {
  rootName: string;
  rootPath?: string;
  projectId?: ProjectId;
  workspaceId?: TaskWorkspaceId;
  branch?: string;
}

export interface ReadWorkspaceFileResponse {
  path: string;
  content: string;
}

export interface WriteWorkspaceFileRequest {
  path: string;
  content: string;
}

export interface WriteWorkspaceFileResponse {
  path: string;
  content: string;
}

export type WorkspaceEntryKind = 'file' | 'dir';

export interface CreateWorkspaceEntryRequest {
  path: string;
  kind: WorkspaceEntryKind;
  content?: string;
}

export interface RenameWorkspaceEntryRequest {
  fromPath: string;
  toPath: string;
}

export interface DeleteWorkspaceEntryRequest {
  path: string;
}

export interface WorkspaceMutationResponse {
  tree: WorkspaceFileNode;
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

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface WorkspaceDiagnostic {
  path: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: DiagnosticSeverity;
  code?: string;
  source: string;
}

export interface DiagnosticsResponse {
  diagnostics: WorkspaceDiagnostic[];
  generatedAt: string;
  workspaceRoot: string;
}

export type ProjectId = string;

export type TaskWorkspaceId = string;

export interface ProjectRecord {
  id: ProjectId;
  name: string;
  repoPath: string;
  gitRoot: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWorkspaceRecord {
  id: TaskWorkspaceId;
  projectId: ProjectId;
  branch: string;
  worktreePath: string;
  baseRef: string;
  status: 'creating' | 'active' | 'failed' | 'removed';
  changedFiles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: ProjectRecord[];
  activeProjectId?: ProjectId;
  activeWorkspaceId?: TaskWorkspaceId;
}

export interface CreateProjectRequest {
  name?: string;
  repoPath: string;
}

export interface CreateProjectResponse {
  project: ProjectRecord;
}

export interface CreateTaskWorkspaceRequest {
  branchName?: string;
  baseRef?: string;
}

export interface TaskWorkspaceResponse {
  project: ProjectRecord;
  workspace: TaskWorkspaceRecord;
}

export interface TaskWorkspaceListResponse {
  workspaces: TaskWorkspaceRecord[];
  activeWorkspaceId?: TaskWorkspaceId;
}

export type ProductTaskId = string;

export type ProductTaskStatus =
  | 'created'
  | 'planning'
  | 'running'
  | 'waiting_approval'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

export type ProductTaskStopReason =
  | 'done'
  | 'blocked'
  | 'approval_required'
  | 'budget_exceeded'
  | 'sandbox_failed'
  | 'cancelled'
  | 'error';

export interface ProductTaskMessage {
  id: string;
  role: 'user' | 'assistant' | 'status' | 'tool' | 'command' | 'approval' | 'error';
  content: string;
  refId?: string;
  createdAt: string;
}

export interface ProductTask {
  id: ProductTaskId;
  sessionId: SessionId;
  projectId?: ProjectId;
  workspaceId?: TaskWorkspaceId;
  title: string;
  status: ProductTaskStatus;
  stopReason?: ProductTaskStopReason;
  conversationSummary: string;
  taskSummary: string;
  latestDecision?: string;
  activeRunId?: AgentRunId;
  messages: ProductTaskMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductTaskListResponse {
  tasks: ProductTask[];
}

export interface ProductTaskResponse {
  task: ProductTask;
}

export type MemoryScope = 'conversation' | 'run' | 'workspace' | 'project' | 'user_preference';

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  sessionId?: SessionId;
  runId?: AgentRunId;
  projectId?: ProjectId;
  workspaceId?: TaskWorkspaceId;
  summary: string;
  source: string;
  createdAt: string;
}

export interface SessionListResponse {
  sessions: AgentSession[];
}

export interface ContextRelevantFile {
  path: string;
  reason: string;
  score: number;
}

export interface ContextBudgetStatus {
  maxChars: number;
  usedChars: number;
  truncated: boolean;
}

export interface ContextSummary {
  taskSummary: string;
  repoMap: string[];
  relevantFiles: ContextRelevantFile[];
  diagnostics: WorkspaceDiagnostic[];
  observationSummary: string[];
  compressedObservationCount: number;
  budget: ContextBudgetStatus;
  generatedAt: string;
}

export type TodoStatus = 'pending' | 'in_progress' | 'done' | 'blocked';

export interface TodoItem {
  id: string;
  title: string;
  status: TodoStatus;
  detail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoListResponse {
  todos: TodoItem[];
}

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
  triggers: string[];
}

export interface SkillSelection {
  skill: SkillInfo;
  reason: string;
  instructions: string;
}

export interface SkillListResponse {
  skills: SkillInfo[];
}

export type SubagentRole = 'planner' | 'coder' | 'reviewer';

export type SubagentPermission = 'read_only' | 'write_patch_with_approval';

export interface SubagentDefinition {
  role: SubagentRole;
  name: string;
  systemPrompt: string;
  permission: SubagentPermission;
  responsibilities: string[];
}

export interface SubagentActionDecision {
  action: PermissionActionKind | 'review_diff';
  effect: PermissionDecisionEffect;
  reason: string;
}

export interface SubagentSummary {
  role: SubagentRole;
  name: string;
  summary: string;
  permission: SubagentPermission;
  decisions: SubagentActionDecision[];
}

export interface SubagentRunSummary {
  task: string;
  summaries: SubagentSummary[];
  createdAt: string;
}

export interface SubagentListResponse {
  subagents: SubagentDefinition[];
}

export type HookPhase =
  | 'onSessionStart'
  | 'beforeToolCall'
  | 'afterToolCall'
  | 'beforeFileEdit'
  | 'afterFileEdit'
  | 'beforeCommandRun'
  | 'afterCommandRun'
  | 'onAgentStop';

export type HookStatus = 'passed' | 'blocked' | 'error';

export interface HookRecord {
  id: string;
  sessionId?: SessionId;
  runId?: AgentRunId;
  phase: HookPhase;
  hookName: string;
  status: HookStatus;
  subject: string;
  message: string;
  summary?: string;
  createdAt: string;
}

export interface HookListResponse {
  hooks: HookRecord[];
}

export type PatchProposalId = string;

export type PatchProposalStatus =
  | 'proposed'
  | 'waiting_approval'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'discarded'
  | 'blocked';

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
  updatedContent?: string;
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

export type PermissionActionKind = 'read_workspace' | 'preview_patch' | 'apply_patch' | 'execute_command';

export type PermissionDecisionEffect = 'allow' | 'approval_required' | 'deny';

export interface GuardrailViolation {
  code: string;
  message: string;
}

export interface PermissionDecision {
  effect: PermissionDecisionEffect;
  action: PermissionActionKind;
  permission: ToolPermission;
  reason: string;
  violations: GuardrailViolation[];
}

export type ApprovalRequestId = string;

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: ApprovalRequestId;
  sessionId: SessionId;
  action: PermissionActionKind;
  subjectId: string;
  permission: ToolPermission;
  status: ApprovalStatus;
  reason: string;
  decision?: PermissionDecision;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
}

export interface RequestPatchApprovalResponse {
  proposal: PatchProposal;
  approval?: ApprovalRequest;
  decision: PermissionDecision;
}

export interface DecideApprovalRequest {
  note?: string;
}

export interface DecidePatchApprovalResponse {
  proposal: PatchProposal;
  approval: ApprovalRequest;
}

export interface ApplyPatchResponse {
  proposal: PatchProposal;
  content: string;
}

export type ShellCommandStatus = 'completed' | 'failed' | 'timed_out' | 'blocked';

export type ShellCommandSafety = 'safe' | 'risky' | 'forbidden';

export interface ShellCommandRequest {
  sessionId?: SessionId;
  taskId?: ProductTaskId;
  command: string;
  timeoutMs?: number;
}

export type SandboxProviderKind = 'local' | 'docker';

export type SandboxNetworkPolicy = 'disabled' | 'host';

export interface SandboxPolicy {
  provider: SandboxProviderKind;
  image?: string;
  network: SandboxNetworkPolicy;
  timeoutMs: number;
  memoryMb?: number;
  cpus?: number;
  secretsInjected: boolean;
}

export interface SandboxExecutionInfo {
  provider: SandboxProviderKind;
  mode: 'isolated' | 'local_fallback';
  policy: SandboxPolicy;
  beforeChangedFiles: string[];
  afterChangedFiles: string[];
  diffSummary: string;
  message: string;
}

export interface ShellCommandResult {
  id: string;
  sessionId?: SessionId;
  taskId?: ProductTaskId;
  command: string;
  argv: string[];
  cwd: string;
  safety: ShellCommandSafety;
  status: ShellCommandStatus;
  exitCode?: number;
  signal?: string;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  decision: PermissionDecision;
  sandbox?: SandboxExecutionInfo;
}

export interface ShellCommandResponse {
  result: ShellCommandResult;
}

export type SelfRepairStatus =
  | 'checking'
  | 'verified'
  | 'proposed_patch'
  | 'waiting_approval'
  | 'ready_to_verify'
  | 'failed'
  | 'blocked';

export type SelfRepairStepKind =
  | 'run_check'
  | 'diagnose_failure'
  | 'create_patch'
  | 'request_approval'
  | 'verify';

export interface SelfRepairStep {
  kind: SelfRepairStepKind;
  title: string;
  detail?: string;
  createdAt: string;
}

export interface SelfRepairAttempt {
  id: string;
  sessionId: SessionId;
  command: string;
  status: SelfRepairStatus;
  message: string;
  commandId?: string;
  patchId?: PatchProposalId;
  approvalId?: ApprovalRequestId;
  steps: SelfRepairStep[];
  createdAt: string;
  updatedAt: string;
}

export interface StartSelfRepairRequest {
  sessionId?: SessionId;
  command?: string;
}

export interface StartSelfRepairResponse {
  session: AgentSession;
  repair: SelfRepairAttempt;
  commandResult: ShellCommandResult;
  proposal?: PatchProposal;
  approval?: ApprovalRequest;
  decision?: PermissionDecision;
}

export interface VerifySelfRepairRequest {
  sessionId: SessionId;
  command?: string;
  patchId?: PatchProposalId;
}

export interface VerifySelfRepairResponse {
  repair: SelfRepairAttempt;
  commandResult: ShellCommandResult;
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
  hooks?: HookRecord[];
  startedAt: string;
  finishedAt: string;
}

export interface ToolCallTrace {
  id?: string;
  sessionId?: SessionId;
  runId?: AgentRunId;
  name: string;
  permission: ToolPermission;
  input: unknown;
  ok: boolean;
  error?: string;
  outputSummary?: string;
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
  usage?: ModelUsage;
}

export type ModelProviderKind = 'mock' | 'openai_compatible';

export type ModelProviderStatus = 'configured' | 'missing_api_key' | 'error';

export interface ModelProviderInfo {
  provider: ModelProviderKind;
  model: string;
  configured: boolean;
  status: ModelProviderStatus;
  message: string;
  baseUrl?: string;
  timeoutMs: number;
}

export interface ModelProviderStatusResponse {
  provider: ModelProviderInfo;
}

export interface ModelUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export type ModelCallStatus = 'completed' | 'failed' | 'timed_out';

export interface ModelCallRecord {
  id: string;
  sessionId?: SessionId;
  runId?: AgentRunId;
  provider: ModelProviderKind;
  model: string;
  status: ModelCallStatus;
  latencyMs: number;
  usage?: ModelUsage;
  requestSummary: string;
  responseSummary?: string;
  error?: string;
  createdAt: string;
}

export interface AgentRunRequest {
  sessionId?: SessionId;
  taskId?: ProductTaskId;
  workspaceId?: TaskWorkspaceId;
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
      type: 'agent.context_summary';
      summary: ContextSummary;
    }
  | {
      type: 'agent.todo_updated';
      todos: TodoItem[];
      reason: string;
    }
  | {
      type: 'agent.skill_selected';
      selection: SkillSelection;
    }
  | {
      type: 'agent.subagent_summary';
      summary: SubagentRunSummary;
    }
  | {
      type: 'agent.model_call';
      call: ModelCallRecord;
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
      finishReason:
        | 'final'
        | 'stop'
        | 'max_iterations'
        | 'error'
        | 'cancelled'
        | 'approval_required'
        | 'sandbox_failed';
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
