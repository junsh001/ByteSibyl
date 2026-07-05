import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  AgentRunEvent,
  AgentRunId,
  AgentRunRecord,
  AgentRunStatus,
  AgentRunStep,
  AgentRunStepType,
  AgentSession,
  AgentSessionStatus,
  ApprovalRequest,
  ApprovalRequestId,
  ApprovalStatus,
  HookRecord,
  ModelCallTrace,
  ModelCallRecord,
  ApprovalTrace,
  CommandTrace,
  FileEditTrace,
  PatchProposal,
  PatchProposalId,
  PatchProposalStatus,
  ShellCommandResult,
  SelfRepairAttempt,
  SessionId,
  SessionLogResponse,
  SessionTraceExport,
  ToolCallTrace,
  TraceTimelineEntry,
} from '@wac/shared';

interface SessionStoreSnapshot {
  sessions: AgentSession[];
  runs: AgentRunRecord[];
  patches?: PatchProposal[];
  approvals?: ApprovalRequest[];
  commands?: ShellCommandResult[];
  repairs?: SelfRepairAttempt[];
  modelCalls?: ModelCallRecord[];
  hooks?: HookRecord[];
}

export class SessionStore {
  private readonly sessions = new Map<SessionId, AgentSession>();
  private readonly runs = new Map<AgentRunId, AgentRunRecord>();
  private readonly patches = new Map<PatchProposalId, PatchProposal>();
  private readonly approvals = new Map<ApprovalRequestId, ApprovalRequest>();
  private readonly commands = new Map<string, ShellCommandResult>();
  private readonly repairs = new Map<string, SelfRepairAttempt>();
  private readonly modelCalls = new Map<string, ModelCallRecord>();
  private readonly hooks = new Map<string, HookRecord>();

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const snapshot = JSON.parse(raw) as SessionStoreSnapshot;
      this.sessions.clear();
      this.runs.clear();
      this.patches.clear();
      this.approvals.clear();
      this.commands.clear();
      this.repairs.clear();
      this.modelCalls.clear();
      this.hooks.clear();
      for (const session of snapshot.sessions ?? []) this.sessions.set(session.id, session);
      for (const run of snapshot.runs ?? []) this.runs.set(run.id, run);
      for (const patch of snapshot.patches ?? []) this.patches.set(patch.id, patch);
      for (const approval of snapshot.approvals ?? []) this.approvals.set(approval.id, approval);
      for (const command of snapshot.commands ?? []) this.commands.set(command.id, command);
      for (const repair of snapshot.repairs ?? []) this.repairs.set(repair.id, repair);
      for (const modelCall of snapshot.modelCalls ?? []) {
        this.modelCalls.set(modelCall.id, modelCall);
      }
      for (const hook of snapshot.hooks ?? []) this.hooks.set(hook.id, hook);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  listSessions(): AgentSession[] {
    return [...this.sessions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getSession(id: SessionId): AgentSession | undefined {
    return this.sessions.get(id);
  }

  getRun(id: AgentRunId): AgentRunRecord | undefined {
    return this.runs.get(id);
  }

  getPatch(id: PatchProposalId): PatchProposal | undefined {
    return this.patches.get(id);
  }

  getApproval(id: ApprovalRequestId): ApprovalRequest | undefined {
    return this.approvals.get(id);
  }

  findPendingApprovalForSubject(subjectId: string): ApprovalRequest | undefined {
    return [...this.approvals.values()].find(
      (approval) => approval.subjectId === subjectId && approval.status === 'pending',
    );
  }

  findApprovedApprovalForSubject(subjectId: string): ApprovalRequest | undefined {
    return [...this.approvals.values()].find(
      (approval) => approval.subjectId === subjectId && approval.status === 'approved',
    );
  }

  async createSession(title?: string): Promise<AgentSession> {
    const now = new Date().toISOString();
    const session: AgentSession = {
      id: randomUUID(),
      title: title?.trim() || 'Untitled agent session',
      status: 'created',
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    await this.save();
    return session;
  }

  async updateSessionStatus(id: SessionId, status: AgentSessionStatus): Promise<AgentSession> {
    const session = this.requireSession(id);
    const updated = { ...session, status, updatedAt: new Date().toISOString() };
    this.sessions.set(id, updated);
    await this.save();
    return updated;
  }

  async createRun(sessionId: SessionId, message: string): Promise<AgentRunRecord> {
    this.requireSession(sessionId);
    const now = new Date().toISOString();
    const run: AgentRunRecord = {
      id: randomUUID(),
      sessionId,
      message,
      status: 'created',
      createdAt: now,
      updatedAt: now,
      events: [],
      steps: [],
    };
    this.runs.set(run.id, run);
    await this.save();
    return run;
  }

  async updateRunStatus(id: AgentRunId, status: AgentRunStatus): Promise<AgentRunRecord> {
    const run = this.requireRun(id);
    const updated = { ...run, status, updatedAt: new Date().toISOString() };
    this.runs.set(id, updated);
    await this.save();
    return updated;
  }

  async appendRunEvent(runId: AgentRunId, event: AgentRunEvent): Promise<AgentRunRecord> {
    const run = this.requireRun(runId);
    const updated = {
      ...run,
      events: [...run.events, event],
      updatedAt: new Date().toISOString(),
    };
    this.runs.set(runId, updated);
    await this.save();
    return updated;
  }

  async appendStep(
    runId: AgentRunId,
    type: AgentRunStepType,
    title: string,
    event?: AgentRunEvent,
  ): Promise<AgentRunStep> {
    const run = this.requireRun(runId);
    const step: AgentRunStep = {
      id: randomUUID(),
      runId,
      type,
      title,
      event,
      createdAt: new Date().toISOString(),
    };
    const updated = {
      ...run,
      steps: [...run.steps, step],
      updatedAt: step.createdAt,
    };
    this.runs.set(runId, updated);
    await this.save();
    return step;
  }

  async savePatchProposal(proposal: PatchProposal): Promise<PatchProposal> {
    this.patches.set(proposal.id, proposal);
    await this.save();
    return proposal;
  }

  async updatePatchStatus(
    id: PatchProposalId,
    status: PatchProposalStatus,
  ): Promise<PatchProposal> {
    const patch = this.requirePatch(id);
    const updated = { ...patch, status, updatedAt: new Date().toISOString() };
    this.patches.set(id, updated);
    await this.save();
    return updated;
  }

  async createApprovalRequest(
    request: Omit<ApprovalRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ApprovalRequest> {
    const now = new Date().toISOString();
    const approval: ApprovalRequest = {
      ...request,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.approvals.set(approval.id, approval);
    await this.save();
    return approval;
  }

  async updateApprovalStatus(
    id: ApprovalRequestId,
    status: ApprovalStatus,
  ): Promise<ApprovalRequest> {
    const approval = this.requireApproval(id);
    const now = new Date().toISOString();
    const updated: ApprovalRequest = {
      ...approval,
      status,
      updatedAt: now,
      decidedAt: status === 'pending' ? approval.decidedAt : now,
    };
    this.approvals.set(id, updated);
    await this.save();
    return updated;
  }

  async saveCommandResult(result: ShellCommandResult): Promise<ShellCommandResult> {
    this.commands.set(result.id, result);
    await this.save();
    return result;
  }

  async saveSelfRepairAttempt(attempt: SelfRepairAttempt): Promise<SelfRepairAttempt> {
    this.repairs.set(attempt.id, attempt);
    await this.save();
    return attempt;
  }

  async saveModelCall(record: ModelCallRecord): Promise<ModelCallRecord> {
    this.modelCalls.set(record.id, record);
    await this.save();
    return record;
  }

  async saveHookRecord(record: HookRecord): Promise<HookRecord> {
    this.hooks.set(record.id, record);
    await this.save();
    return record;
  }

  async saveHookRecords(records: HookRecord[]): Promise<HookRecord[]> {
    for (const record of records) this.hooks.set(record.id, record);
    await this.save();
    return records;
  }

  getSessionLog(sessionId: SessionId): SessionLogResponse {
    const session = this.requireSession(sessionId);
    const runs = [...this.runs.values()]
      .filter((run) => run.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const patches = [...this.patches.values()]
      .filter((patch) => patch.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const approvals = [...this.approvals.values()]
      .filter((approval) => approval.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const commands = [...this.commands.values()]
      .filter((command) => command.sessionId === sessionId)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    const repairs = [...this.repairs.values()]
      .filter((repair) => repair.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const modelCalls = [...this.modelCalls.values()]
      .filter((modelCall) => modelCall.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const hooks = [...this.hooks.values()]
      .filter((hook) => hook.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { session, runs, patches, approvals, commands, repairs, modelCalls, hooks };
  }

  getSessionTrace(sessionId: SessionId): SessionTraceExport {
    const log = this.getSessionLog(sessionId);
    const modelCalls = log.modelCalls.map(toModelCallTrace);
    const toolCalls = log.runs.flatMap((run) => toToolCallTraces(run));
    const fileEdits = log.patches.map(toFileEditTrace);
    const commands = log.commands.map(toCommandTrace);
    const approvals = log.approvals.map(toApprovalTrace);
    const timeline = [
      toSessionTraceEntry(log.session),
      ...log.runs.flatMap((run) => run.steps.map((step) => toRunStepTraceEntry(log.session.id, step))),
      ...modelCalls.map((trace) => toTimelineEntry(log.session.id, 'model_call', trace)),
      ...toolCalls.map((trace) => toTimelineEntry(log.session.id, 'tool_call', trace)),
      ...fileEdits.map((trace) => toTimelineEntry(log.session.id, 'file_edit', trace)),
      ...commands.map((trace) => toTimelineEntry(log.session.id, 'command', trace)),
      ...approvals.map((trace) => toTimelineEntry(log.session.id, 'approval', trace)),
      ...log.hooks.map((hook) => toTimelineEntry(log.session.id, 'hook', hook)),
    ].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));

    return {
      session: log.session,
      generatedAt: new Date().toISOString(),
      timeline,
      modelCalls,
      toolCalls,
      fileEdits,
      commands,
      approvals,
      hooks: log.hooks,
    };
  }

  private requireSession(id: SessionId): AgentSession {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`session not found: ${id}`);
    return session;
  }

  private requireRun(id: AgentRunId): AgentRunRecord {
    const run = this.runs.get(id);
    if (!run) throw new Error(`run not found: ${id}`);
    return run;
  }

  private requirePatch(id: PatchProposalId): PatchProposal {
    const patch = this.patches.get(id);
    if (!patch) throw new Error(`patch not found: ${id}`);
    return patch;
  }

  private requireApproval(id: ApprovalRequestId): ApprovalRequest {
    const approval = this.approvals.get(id);
    if (!approval) throw new Error(`approval not found: ${id}`);
    return approval;
  }

  private async save(): Promise<void> {
    const snapshot: SessionStoreSnapshot = {
      sessions: this.listSessions(),
      runs: [...this.runs.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      patches: [...this.patches.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      approvals: [...this.approvals.values()].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
      commands: [...this.commands.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
      repairs: [...this.repairs.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      modelCalls: [...this.modelCalls.values()].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
      hooks: [...this.hooks.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    await rename(tmpPath, this.filePath);
  }
}

function toSessionTraceEntry(session: AgentSession): TraceTimelineEntry {
  return {
    id: `session:${session.id}`,
    sessionId: session.id,
    kind: 'session',
    title: `Session ${session.status}`,
    summary: session.title,
    status: session.status,
    refId: session.id,
    timestamp: session.createdAt,
    data: session,
  };
}

function toRunStepTraceEntry(sessionId: SessionId, step: AgentRunStep): TraceTimelineEntry {
  return {
    id: `step:${step.id}`,
    sessionId,
    runId: step.runId,
    kind: step.type === 'model_call' ? 'model_call' : step.type === 'tool_call' ? 'tool_call' : step.type === 'tool_result' ? 'tool_result' : 'agent_event',
    title: step.title,
    summary: summarizeEvent(step.event) || step.title,
    status: step.type,
    refId: step.id,
    timestamp: step.createdAt,
    data: step,
  };
}

function toModelCallTrace(record: ModelCallRecord): ModelCallTrace {
  return {
    id: record.id,
    sessionId: record.sessionId,
    runId: record.runId,
    provider: record.provider,
    model: record.model,
    status: record.status,
    latencyMs: record.latencyMs,
    usage: record.usage,
    requestSummary: record.requestSummary,
    responseSummary: record.responseSummary,
    error: record.error,
    timestamp: record.createdAt,
  };
}

function toToolCallTraces(run: AgentRunRecord): ToolCallTrace[] {
  const calls = run.events.filter((event) => event.type === 'agent.tool_call');
  const results = run.events.filter((event) => event.type === 'agent.tool_result');
  return calls.map((event, index) => {
    const result = results[index]?.type === 'agent.tool_result' ? results[index].result : undefined;
    return {
      id: `tool:${run.id}:${index}`,
      sessionId: run.sessionId,
      runId: run.id,
      name: event.call.name,
      permission: result?.permission ?? 'read_only',
      input: event.call.input,
      ok: result?.ok ?? false,
      error: result?.error,
      outputSummary: result?.output === undefined ? undefined : summarizeText(JSON.stringify(result.output)),
      startedAt: result?.startedAt ?? run.createdAt,
      finishedAt: result?.finishedAt ?? result?.startedAt ?? run.updatedAt,
    };
  });
}

function toFileEditTrace(patch: PatchProposal): FileEditTrace {
  const beforeSample = patch.hunks.flatMap((hunk) =>
    hunk.lines.filter((line) => line.type === 'remove' || line.type === 'context').map((line) => line.content),
  );
  const afterSample = patch.hunks.flatMap((hunk) =>
    hunk.lines.filter((line) => line.type === 'add' || line.type === 'context').map((line) => line.content),
  );
  return {
    id: patch.id,
    sessionId: patch.sessionId,
    path: patch.path,
    status: patch.status,
    additions: patch.additions,
    deletions: patch.deletions,
    before: {
      lineCount: patch.oldLineCount,
      sample: beforeSample.slice(0, 12),
    },
    after: {
      lineCount: patch.newLineCount,
      sample: afterSample.slice(0, 12),
    },
    unifiedDiff: patch.unifiedDiff,
    createdAt: patch.createdAt,
    updatedAt: patch.updatedAt,
  };
}

function toCommandTrace(command: ShellCommandResult): CommandTrace {
  return {
    id: command.id,
    sessionId: command.sessionId,
    command: command.command,
    argv: command.argv,
    cwd: command.cwd,
    safety: command.safety,
    status: command.status,
    exitCode: command.exitCode,
    durationMs: command.durationMs,
    stdoutSummary: summarizeText(command.stdout),
    stderrSummary: summarizeText(command.stderr),
    startedAt: command.startedAt,
    finishedAt: command.finishedAt,
  };
}

function toApprovalTrace(approval: ApprovalRequest): ApprovalTrace {
  return {
    id: approval.id,
    sessionId: approval.sessionId,
    action: approval.action,
    subjectId: approval.subjectId,
    permission: approval.permission,
    status: approval.status,
    reason: approval.reason,
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt,
    decidedAt: approval.decidedAt,
  };
}

function toTimelineEntry(
  sessionId: SessionId,
  kind: TraceTimelineEntry['kind'],
  data: ModelCallTrace | ToolCallTrace | FileEditTrace | CommandTrace | ApprovalTrace | HookRecord,
): TraceTimelineEntry {
  if (kind === 'model_call') {
    const trace = data as ModelCallTrace;
    return {
      id: `model:${trace.id}`,
      sessionId,
      runId: trace.runId,
      kind,
      title: `Model ${trace.provider}/${trace.model}`,
      summary: trace.responseSummary ?? trace.error ?? trace.requestSummary,
      status: trace.status,
      refId: trace.id,
      timestamp: trace.timestamp,
      data: trace,
    };
  }
  if (kind === 'tool_call') {
    const trace = data as ToolCallTrace;
    return {
      id: trace.id ?? `tool:${trace.name}:${trace.startedAt}`,
      sessionId,
      runId: trace.runId,
      kind,
      title: `Tool ${trace.name}`,
      summary: trace.error ?? trace.outputSummary ?? JSON.stringify(trace.input),
      status: trace.ok ? 'completed' : 'failed',
      refId: trace.id,
      timestamp: trace.startedAt,
      data: trace,
    };
  }
  if (kind === 'file_edit') {
    const trace = data as FileEditTrace;
    return {
      id: `file:${trace.id}`,
      sessionId,
      kind,
      title: `File edit ${trace.path}`,
      summary: `${trace.status} +${trace.additions} -${trace.deletions}`,
      status: trace.status,
      refId: trace.id,
      timestamp: trace.updatedAt,
      data: trace,
    };
  }
  if (kind === 'command') {
    const trace = data as CommandTrace;
    return {
      id: `command:${trace.id}`,
      sessionId,
      kind,
      title: `Command ${trace.command}`,
      summary: `exit=${trace.exitCode ?? 'n/a'} status=${trace.status}`,
      status: trace.status,
      refId: trace.id,
      timestamp: trace.finishedAt,
      data: trace,
    };
  }
  if (kind === 'approval') {
    const trace = data as ApprovalTrace;
    return {
      id: `approval:${trace.id}`,
      sessionId,
      kind,
      title: `Approval ${trace.action}`,
      summary: `${trace.status} ${trace.reason}`,
      status: trace.status,
      refId: trace.id,
      timestamp: trace.updatedAt,
      data: trace,
    };
  }
  const hook = data as HookRecord;
  return {
    id: `hook:${hook.id}`,
    sessionId,
    runId: hook.runId,
    kind,
    title: `Hook ${hook.phase}`,
    summary: hook.summary ?? hook.message,
    status: hook.status,
    refId: hook.id,
    timestamp: hook.createdAt,
    data: hook,
  };
}

function summarizeEvent(event?: AgentRunEvent): string {
  if (!event) return '';
  switch (event.type) {
    case 'agent.run_created':
      return event.run.message;
    case 'agent.status':
      return event.message;
    case 'agent.iteration':
      return `${event.iteration}/${event.maxIterations}`;
    case 'agent.context_summary':
      return event.summary.taskSummary;
    case 'agent.todo_updated':
      return event.reason;
    case 'agent.skill_selected':
      return event.selection.reason;
    case 'agent.subagent_summary':
      return event.summary.summaries.map((summary) => `${summary.role}:${summary.permission}`).join(', ');
    case 'agent.model_call':
      return event.call.responseSummary ?? event.call.requestSummary;
    case 'agent.message':
      return event.content;
    case 'agent.tool_call':
      return `${event.call.name} ${JSON.stringify(event.call.input)}`;
    case 'agent.tool_result':
      return event.result.error ?? event.result.name;
    case 'agent.error':
      return event.message;
    case 'agent.done':
      return event.finishReason;
  }
}

function summarizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim().slice(0, 240) || '<empty>';
}
