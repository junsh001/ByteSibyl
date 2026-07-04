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
  PatchProposal,
  PatchProposalId,
  PatchProposalStatus,
  SessionId,
  SessionLogResponse,
} from '@wac/shared';

interface SessionStoreSnapshot {
  sessions: AgentSession[];
  runs: AgentRunRecord[];
  patches?: PatchProposal[];
}

export class SessionStore {
  private readonly sessions = new Map<SessionId, AgentSession>();
  private readonly runs = new Map<AgentRunId, AgentRunRecord>();
  private readonly patches = new Map<PatchProposalId, PatchProposal>();

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const snapshot = JSON.parse(raw) as SessionStoreSnapshot;
      this.sessions.clear();
      this.runs.clear();
      this.patches.clear();
      for (const session of snapshot.sessions ?? []) this.sessions.set(session.id, session);
      for (const run of snapshot.runs ?? []) this.runs.set(run.id, run);
      for (const patch of snapshot.patches ?? []) this.patches.set(patch.id, patch);
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

  getSessionLog(sessionId: SessionId): SessionLogResponse {
    const session = this.requireSession(sessionId);
    const runs = [...this.runs.values()]
      .filter((run) => run.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const patches = [...this.patches.values()]
      .filter((patch) => patch.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { session, runs, patches };
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

  private async save(): Promise<void> {
    const snapshot: SessionStoreSnapshot = {
      sessions: this.listSessions(),
      runs: [...this.runs.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      patches: [...this.patches.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    await rename(tmpPath, this.filePath);
  }
}
