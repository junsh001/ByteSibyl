import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

export interface ProgressRow {
  lessonId: string;
  status: 'locked' | 'available' | 'completed';
  completedTaskIds: string[];
}

/**
 * The data access surface. SQLite implementation lives below; swapping in a
 * Postgres-backed Db is a matter of providing the same methods.
 */
export interface Db {
  // projects
  listProjects(): Project[];
  getProject(id: string): Project | undefined;
  createProject(p: Project): Project;
  // messages
  listMessages(projectId: string): StoredMessage[];
  addMessage(m: StoredMessage): void;
  // tutorial progress
  getProgress(): ProgressRow[];
  setProgress(row: ProgressRow): void;
  getXp(): number;
  addXp(amount: number): number;
}

export function createDb(databaseUrl: string): Db {
  const file = resolve(databaseUrl);
  mkdirSync(dirname(file), { recursive: true });
  const sql = new Database(file);
  sql.pragma('journal_mode = WAL');
  sql.pragma('foreign_keys = ON');

  sql.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);
    CREATE TABLE IF NOT EXISTS lesson_progress (
      lesson_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      completed_task_ids TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return {
    listProjects() {
      return sql
        .prepare('SELECT id, name, created_at as createdAt FROM projects ORDER BY created_at DESC')
        .all() as Project[];
    },
    getProject(id) {
      return sql
        .prepare('SELECT id, name, created_at as createdAt FROM projects WHERE id = ?')
        .get(id) as Project | undefined;
    },
    createProject(p) {
      sql
        .prepare('INSERT INTO projects (id, name, created_at) VALUES (?, ?, ?)')
        .run(p.id, p.name, p.createdAt);
      return p;
    },
    listMessages(projectId) {
      return sql
        .prepare(
          'SELECT id, project_id as projectId, role, content, created_at as createdAt FROM messages WHERE project_id = ? ORDER BY created_at ASC',
        )
        .all(projectId) as StoredMessage[];
    },
    addMessage(m) {
      sql
        .prepare(
          'INSERT INTO messages (id, project_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .run(m.id, m.projectId, m.role, m.content, m.createdAt);
    },
    getProgress() {
      const rows = sql
        .prepare('SELECT lesson_id as lessonId, status, completed_task_ids as completed FROM lesson_progress')
        .all() as { lessonId: string; status: ProgressRow['status']; completed: string }[];
      return rows.map((r) => ({
        lessonId: r.lessonId,
        status: r.status,
        completedTaskIds: JSON.parse(r.completed) as string[],
      }));
    },
    setProgress(row) {
      sql
        .prepare(
          `INSERT INTO lesson_progress (lesson_id, status, completed_task_ids) VALUES (?, ?, ?)
           ON CONFLICT(lesson_id) DO UPDATE SET status = excluded.status, completed_task_ids = excluded.completed_task_ids`,
        )
        .run(row.lessonId, row.status, JSON.stringify(row.completedTaskIds));
    },
    getXp() {
      const r = sql.prepare("SELECT value FROM kv WHERE key = 'xp'").get() as
        | { value: string }
        | undefined;
      return r ? Number(r.value) : 0;
    },
    addXp(amount) {
      const next = this.getXp() + amount;
      sql
        .prepare("INSERT INTO kv (key, value) VALUES ('xp', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
        .run(String(next));
      return next;
    },
  };
}
