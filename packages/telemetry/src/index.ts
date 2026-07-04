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
  SessionId,
  SessionLogResponse,
} from '@wac/shared';

interface SessionStoreSnapshot {
  sessions: AgentSession[];
  runs: AgentRunRecord[];
}

export class SessionStore {
  private readonly sessions = new Map<SessionId, AgentSession>();
  private readonly runs = new Map<AgentRunId, AgentRunRecord>();

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const snapshot = JSON.parse(raw) as SessionStoreSnapshot;
      this.sessions.clear();
      this.runs.clear();
      for (const session of snapshot.sessions ?? []) this.sessions.set(session.id, session);
      for (const run of snapshot.runs ?? []) this.runs.set(run.id, run);
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

  getSessionLog(sessionId: SessionId): SessionLogResponse {
    const session = this.requireSession(sessionId);
    const runs = [...this.runs.values()]
      .filter((run) => run.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { session, runs };
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

  private async save(): Promise<void> {
    const snapshot: SessionStoreSnapshot = {
      sessions: this.listSessions(),
      runs: [...this.runs.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    await rename(tmpPath, this.filePath);
  }
}
