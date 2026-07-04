import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import type { SearchTextMatch, WorkspaceFileNode } from '@wac/shared';

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
  readonly root: string;
  private readonly ignoredDirs: Set<string>;

  constructor(root: string, options: WorkspaceOptions = {}) {
    this.root = resolve(root);
    this.ignoredDirs = options.ignoredDirs ?? DEFAULT_IGNORED_DIRS;
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
}

function joinRelative(base: string, name: string): string {
  return base ? `${base}/${name}` : name;
}
