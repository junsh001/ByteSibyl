import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import type {
  ProjectId,
  ProjectRecord,
  SearchTextMatch,
  TaskWorkspaceId,
  TaskWorkspaceRecord,
  WorkspaceFileNode,
} from '@wac/shared';

const execFileAsync = promisify(execFile);

const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  '.cache',
]);

const MAX_READ_BYTES = 512 * 1024;
const MAX_SEARCH_FILE_BYTES = 512 * 1024;
const MAX_SEARCH_RESULTS = 100;

export interface WorkspaceOptions {
  ignoredDirs?: Set<string>;
}

export class WorkspacePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspacePathError';
  }
}

export class WorkspaceService {
  root: string;
  private readonly ignoredDirs: Set<string>;

  constructor(root: string, options: WorkspaceOptions = {}) {
    this.root = resolve(root);
    this.ignoredDirs = options.ignoredDirs ?? DEFAULT_IGNORED_DIRS;
  }

  setRoot(root: string): void {
    this.root = resolve(root);
  }

  async tree(): Promise<WorkspaceFileNode> {
    const rootStat = await stat(this.root);
    if (!rootStat.isDirectory()) {
      throw new Error(`Workspace root is not a directory: ${this.root}`);
    }

    return {
      name: this.root.split(sep).at(-1) || this.root,
      path: '',
      type: 'dir',
      children: await this.readDir(''),
    };
  }

  async readTextFile(path: string): Promise<string> {
    const absolute = this.resolveInside(path);
    const fileStat = await stat(absolute);
    if (!fileStat.isFile()) {
      throw new Error(`Not a file: ${path}`);
    }
    if (fileStat.size > MAX_READ_BYTES) {
      throw new Error(`File is too large to read in Phase 2: ${path}`);
    }
    return readFile(absolute, 'utf8');
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const absolute = this.resolveInside(path);
    const fileStat = await stat(absolute);
    if (!fileStat.isFile()) {
      throw new Error(`Not a file: ${path}`);
    }
    await writeFile(absolute, content, 'utf8');
  }

  async createTextFile(path: string, content = ''): Promise<void> {
    const absolute = this.resolveInsideNonRoot(path);
    await writeFile(absolute, content, { encoding: 'utf8', flag: 'wx' });
  }

  async createDirectory(path: string): Promise<void> {
    const absolute = this.resolveInsideNonRoot(path);
    await mkdir(absolute);
  }

  async renameEntry(fromPath: string, toPath: string): Promise<void> {
    const from = this.resolveInsideNonRoot(fromPath);
    const to = this.resolveInsideNonRoot(toPath);
    try {
      await stat(to);
      throw new Error(`Target already exists: ${toPath}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    await rename(from, to);
  }

  async deleteEntry(path: string): Promise<void> {
    const absolute = this.resolveInsideNonRoot(path);
    await rm(absolute, { recursive: true, force: false });
  }

  async searchText(query: string): Promise<SearchTextMatch[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const matches: SearchTextMatch[] = [];
    await this.searchDir('', trimmed, matches);
    return matches;
  }

  private async readDir(relativeDir: string): Promise<WorkspaceFileNode[]> {
    const absolute = this.resolveInside(relativeDir);
    const entries = await readdir(absolute, { withFileTypes: true });
    const nodes = await Promise.all(
      entries
        .filter((entry) => !entry.name.startsWith('.') || entry.name === '.env.example')
        .filter((entry) => !(entry.isDirectory() && this.ignoredDirs.has(entry.name)))
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map(async (entry): Promise<WorkspaceFileNode> => {
          const childPath = joinRelative(relativeDir, entry.name);
          if (entry.isDirectory()) {
            return {
              name: entry.name,
              path: childPath,
              type: 'dir',
              children: await this.readDir(childPath),
            };
          }
          return {
            name: entry.name,
            path: childPath,
            type: 'file',
          };
        }),
    );
    return nodes;
  }

  private async searchDir(
    relativeDir: string,
    query: string,
    matches: SearchTextMatch[],
  ): Promise<void> {
    if (matches.length >= MAX_SEARCH_RESULTS) return;

    const absolute = this.resolveInside(relativeDir);
    const entries = await readdir(absolute, { withFileTypes: true });
    for (const entry of entries) {
      if (matches.length >= MAX_SEARCH_RESULTS) return;
      if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
      if (entry.isDirectory() && this.ignoredDirs.has(entry.name)) continue;

      const childPath = joinRelative(relativeDir, entry.name);
      if (entry.isDirectory()) {
        await this.searchDir(childPath, query, matches);
        continue;
      }
      if (!entry.isFile()) continue;
      await this.searchFile(childPath, query, matches);
    }
  }

  private async searchFile(
    relativePath: string,
    query: string,
    matches: SearchTextMatch[],
  ): Promise<void> {
    const absolute = this.resolveInside(relativePath);
    const fileStat = await stat(absolute);
    if (fileStat.size > MAX_SEARCH_FILE_BYTES) return;

    let content: string;
    try {
      content = await readFile(absolute, 'utf8');
    } catch {
      return;
    }

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (matches.length >= MAX_SEARCH_RESULTS) return;
      const line = lines[index] ?? '';
      const columnIndex = line.toLowerCase().indexOf(query.toLowerCase());
      if (columnIndex === -1) continue;
      matches.push({
        path: relativePath,
        line: index + 1,
        column: columnIndex + 1,
        snippet: line.trim(),
      });
    }
  }

  private resolveInside(path: string): string {
    const normalizedInput = path.replaceAll('\\', '/');
    if (normalizedInput.startsWith('/')) {
      throw new WorkspacePathError(`Absolute paths are not allowed: ${path}`);
    }

    const absolute = resolve(this.root, normalizedInput || '.');
    const rel = relative(this.root, absolute);
    if (rel === '') return absolute;
    if (rel.startsWith('..') || rel === '..' || absolute === this.root) {
      throw new WorkspacePathError(`Path escapes workspace root: ${path}`);
    }
    return absolute;
  }

  private resolveInsideNonRoot(path: string): string {
    if (!path.trim()) {
      throw new WorkspacePathError('Workspace root cannot be mutated.');
    }
    return this.resolveInside(path);
  }
}

interface ProjectStoreSnapshot {
  projects: ProjectRecord[];
  workspaces: TaskWorkspaceRecord[];
  activeProjectId?: ProjectId;
  activeWorkspaceId?: TaskWorkspaceId;
}

export interface ProjectWorkspaceStoreOptions {
  filePath: string;
  worktreesRoot: string;
}

export class ProjectWorkspaceStore {
  private readonly filePath: string;
  private readonly worktreesRoot: string;
  private readonly projects = new Map<ProjectId, ProjectRecord>();
  private readonly workspaces = new Map<TaskWorkspaceId, TaskWorkspaceRecord>();
  private activeProjectId?: ProjectId;
  private activeWorkspaceId?: TaskWorkspaceId;

  constructor(options: ProjectWorkspaceStoreOptions) {
    this.filePath = resolve(options.filePath);
    this.worktreesRoot = resolve(options.worktreesRoot);
  }

  async load(): Promise<void> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const snapshot = JSON.parse(raw) as ProjectStoreSnapshot;
      this.projects.clear();
      this.workspaces.clear();
      for (const project of snapshot.projects ?? []) this.projects.set(project.id, project);
      for (const workspace of snapshot.workspaces ?? []) this.workspaces.set(workspace.id, workspace);
      this.activeProjectId = snapshot.activeProjectId;
      this.activeWorkspaceId = snapshot.activeWorkspaceId;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  listProjects(): ProjectRecord[] {
    return [...this.projects.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  listWorkspaces(projectId: ProjectId): TaskWorkspaceRecord[] {
    return [...this.workspaces.values()]
      .filter((workspace) => workspace.projectId === projectId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  getProject(id: ProjectId): ProjectRecord | undefined {
    return this.projects.get(id);
  }

  getWorkspace(id: TaskWorkspaceId): TaskWorkspaceRecord | undefined {
    return this.workspaces.get(id);
  }

  getActiveProjectId(): ProjectId | undefined {
    return this.activeProjectId;
  }

  getActiveWorkspaceId(): TaskWorkspaceId | undefined {
    return this.activeWorkspaceId;
  }

  getActiveWorkspace(): TaskWorkspaceRecord | undefined {
    return this.activeWorkspaceId ? this.workspaces.get(this.activeWorkspaceId) : undefined;
  }

  async createProject(input: { name?: string; repoPath: string }): Promise<ProjectRecord> {
    const gitRoot = await resolveGitRoot(input.repoPath);
    const defaultBranch = await currentBranch(gitRoot);
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: randomUUID(),
      name: input.name?.trim() || basename(gitRoot) || 'Git Project',
      repoPath: resolve(input.repoPath),
      gitRoot,
      defaultBranch,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    this.activeProjectId = project.id;
    await this.save();
    return project;
  }

  async createTaskWorkspace(
    projectId: ProjectId,
    input: { branchName?: string; baseRef?: string } = {},
  ): Promise<TaskWorkspaceRecord> {
    const project = this.requireProject(projectId);
    const now = new Date().toISOString();
    const id = randomUUID();
    const branch = sanitizeBranchName(input.branchName ?? `bytesibyl/task-${id.slice(0, 8)}`);
    const baseRef = input.baseRef?.trim() || project.defaultBranch || 'HEAD';
    const worktreePath = join(this.worktreesRoot, project.id, id);
    const workspace: TaskWorkspaceRecord = {
      id,
      projectId,
      branch,
      worktreePath,
      baseRef,
      status: 'creating',
      changedFiles: [],
      createdAt: now,
      updatedAt: now,
    };
    this.workspaces.set(id, workspace);
    await this.save();

    try {
      await mkdir(dirname(worktreePath), { recursive: true });
      await git(project.gitRoot, ['worktree', 'add', '-b', branch, worktreePath, baseRef]);
      const active = {
        ...workspace,
        status: 'active' as const,
        changedFiles: await getChangedFiles(worktreePath),
        updatedAt: new Date().toISOString(),
      };
      this.workspaces.set(id, active);
      this.activeProjectId = project.id;
      this.activeWorkspaceId = id;
      await this.save();
      return active;
    } catch (err) {
      const failed = {
        ...workspace,
        status: 'failed' as const,
        updatedAt: new Date().toISOString(),
      };
      this.workspaces.set(id, failed);
      await this.save();
      throw err;
    }
  }

  async refreshWorkspace(id: TaskWorkspaceId): Promise<TaskWorkspaceRecord> {
    const workspace = this.requireWorkspace(id);
    const changedFiles =
      workspace.status === 'active' ? await getChangedFiles(workspace.worktreePath) : workspace.changedFiles;
    const updated = { ...workspace, changedFiles, updatedAt: new Date().toISOString() };
    this.workspaces.set(id, updated);
    await this.save();
    return updated;
  }

  async activateWorkspace(id: TaskWorkspaceId): Promise<TaskWorkspaceRecord> {
    const workspace = await this.refreshWorkspace(id);
    this.activeProjectId = workspace.projectId;
    this.activeWorkspaceId = workspace.id;
    await this.save();
    return workspace;
  }

  private requireProject(id: ProjectId): ProjectRecord {
    const project = this.projects.get(id);
    if (!project) throw new Error(`Project not found: ${id}`);
    return project;
  }

  private requireWorkspace(id: TaskWorkspaceId): TaskWorkspaceRecord {
    const workspace = this.workspaces.get(id);
    if (!workspace) throw new Error(`Task workspace not found: ${id}`);
    return workspace;
  }

  private async save(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const snapshot: ProjectStoreSnapshot = {
      projects: this.listProjects(),
      workspaces: [...this.workspaces.values()],
      activeProjectId: this.activeProjectId,
      activeWorkspaceId: this.activeWorkspaceId,
    };
    await writeFile(this.filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  }
}

function joinRelative(base: string, name: string): string {
  return base ? `${base}/${name}` : name;
}

async function resolveGitRoot(repoPath: string): Promise<string> {
  const root = resolve(repoPath);
  const { stdout } = await git(root, ['rev-parse', '--show-toplevel']);
  return stdout.trim();
}

async function currentBranch(gitRoot: string): Promise<string> {
  const { stdout } = await git(gitRoot, ['branch', '--show-current']);
  return stdout.trim() || 'HEAD';
}

async function getChangedFiles(worktreePath: string): Promise<string[]> {
  const { stdout } = await git(worktreePath, ['status', '--porcelain']);
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

async function git(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, { cwd });
    return { stdout: String(stdout), stderr: String(stderr) };
  } catch (err) {
    const error = err as Error & { stderr?: string };
    throw new Error(error.stderr || error.message);
  }
}

function sanitizeBranchName(name: string): string {
  return name
    .trim()
    .replace(/^\/*/u, '')
    .replace(/\s+/gu, '-')
    .replace(/[^A-Za-z0-9._/-]/gu, '-')
    .replace(/\.\.+/gu, '.')
    .replace(/\/+/gu, '/')
    .slice(0, 120) || `bytesibyl/task-${randomUUID().slice(0, 8)}`;
}
