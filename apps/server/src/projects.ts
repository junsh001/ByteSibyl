import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { Workspace } from '@wac/agent';
import type { Db, Project } from '@wac/db';
import type { AppConfig } from './config.js';

const STARTER_README = `# 我的项目 / My Project

欢迎！在左侧对话框告诉 AI 你想做什么，它会帮你写代码、运行并验证。
Welcome! Tell the AI in the chat what you want to build — it will write, run, and verify the code for you.

试试 / Try:
- "用 Node 写一个猜数字游戏并运行它"
- "Create an Express server with a /health endpoint and test it"
`;

export class ProjectService {
  constructor(
    private cfg: AppConfig,
    private db: Db,
  ) {
    mkdirSync(cfg.workspaceRoot, { recursive: true });
  }

  workspaceFor(projectId: string): Workspace {
    return new Workspace(join(this.cfg.workspaceRoot, projectId));
  }

  list(): Project[] {
    return this.db.listProjects();
  }

  get(id: string): Project | undefined {
    return this.db.getProject(id);
  }

  async create(name?: string): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      id,
      name: name?.trim() || 'Untitled project',
      createdAt: Date.now(),
    };
    const dir = join(this.cfg.workspaceRoot, id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, 'README.md'), STARTER_README, 'utf8');
    this.db.createProject(project);
    return project;
  }

  /** Ensure there is at least one project; return the default one. */
  async ensureDefault(): Promise<Project> {
    const existing = this.db.listProjects();
    if (existing.length > 0) return existing[existing.length - 1]!;
    return this.create('我的第一个项目 / My First Project');
  }
}
