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
  ModelCallRecord,
  PatchProposal,
  PatchProposalId,
  PatchProposalStatus,
  ShellCommandResult,
  SelfRepairAttempt,
  SessionId,
  SessionLogResponse,
} from '@wac/shared';

interface SessionStoreSnapshot {
  sessions: AgentSession[];
  runs: AgentRunRecord[];
  patches?: PatchProposal[];
  approvals?: ApprovalRequest[];
  commands?: ShellCommandResult[];
  repairs?: SelfRepairAttempt[];
  modelCalls?: ModelCallRecord[];
}

export class SessionStore {
  private readonly sessions = new Map<SessionId, AgentSession>();
  private readonly runs = new Map<AgentRunId, AgentRunRecord>();
  private readonly patches = new Map<PatchProposalId, PatchProposal>();
  private readonly approvals = new Map<ApprovalRequestId, ApprovalRequest>();
  private readonly commands = new Map<string, ShellCommandResult>();
  private readonly repairs = new Map<string, SelfRepairAttempt>();
  private readonly modelCalls = new Map<string, ModelCallRecord>();

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
      for (const session of snapshot.sessions ?? []) this.sessions.set(session.id, session);
      for (const run of snapshot.runs ?? []) this.runs.set(run.id, run);
      for (const patch of snapshot.patches ?? []) this.patches.set(patch.id, patch);
      for (const approval of snapshot.approvals ?? []) this.approvals.set(approval.id, approval);
      for (const command of snapshot.commands ?? []) this.commands.set(command.id, command);
      for (const repair of snapshot.repairs ?? []) this.repairs.set(repair.id, repair);
      for (const modelCall of snapshot.modelCalls ?? []) {
        this.modelCalls.set(modelCall.id, modelCall);
      }
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
    return { session, runs, patches, approvals, commands, repairs, modelCalls };
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
    };
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    await rename(tmpPath, this.filePath);
  }
}
