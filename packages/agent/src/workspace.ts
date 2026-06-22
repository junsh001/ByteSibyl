import { promises as fs } from 'node:fs';
import { join, normalize, relative, sep, posix } from 'node:path';
import type { FileNode } from '@wac/shared';

/** Directories we never descend into when listing/searching. */
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.vite', '__pycache__']);

/**
 * A project workspace rooted at an absolute directory. Every path coming from
 * the model is treated as relative to the root and is sandboxed: attempts to
 * escape via `..` or absolute paths are rejected.
 */
export class Workspace {
  constructor(readonly root: string) {}

  /** Resolve a model-supplied relative path to an absolute path inside root. */
  private abs(rel: string): string {
    const clean = normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
    const full = join(this.root, clean);
    const rootWithSep = this.root.endsWith(sep) ? this.root : this.root + sep;
    if (full !== this.root && !full.startsWith(rootWithSep)) {
      throw new Error(`Path escapes workspace: ${rel}`);
    }
    return full;
  }

  private toPosix(rel: string): string {
    return rel.split(sep).join(posix.sep);
  }

  async readFile(rel: string): Promise<string> {
    return fs.readFile(this.abs(rel), 'utf8');
  }

  async exists(rel: string): Promise<boolean> {
    try {
      await fs.stat(this.abs(rel));
      return true;
    } catch {
      return false;
    }
  }

  async writeFile(rel: string, content: string): Promise<'create' | 'update'> {
    const existed = await this.exists(rel);
    const full = this.abs(rel);
    await fs.mkdir(join(full, '..'), { recursive: true });
    await fs.writeFile(full, content, 'utf8');
    return existed ? 'update' : 'create';
  }

  async deleteFile(rel: string): Promise<void> {
    await fs.rm(this.abs(rel), { recursive: true, force: true });
  }

  /** Build a nested file tree, ignoring noise directories. */
  async tree(): Promise<FileNode> {
    const walk = async (absDir: string, relDir: string): Promise<FileNode[]> => {
      let entries: import('node:fs').Dirent[];
      try {
        entries = await fs.readdir(absDir, { withFileTypes: true });
      } catch {
        return [];
      }
      entries.sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      const nodes: FileNode[] = [];
      for (const e of entries) {
        if (e.name.startsWith('.') && e.name !== '.env.example') continue;
        if (IGNORE.has(e.name)) continue;
        const childRel = this.toPosix(relDir ? join(relDir, e.name) : e.name);
        if (e.isDirectory()) {
          nodes.push({
            name: e.name,
            path: childRel,
            type: 'dir',
            children: await walk(join(absDir, e.name), childRel),
          });
        } else {
          nodes.push({ name: e.name, path: childRel, type: 'file' });
        }
      }
      return nodes;
    };
    return { name: '/', path: '', type: 'dir', children: await walk(this.root, '') };
  }

  /** Naive recursive grep returning up to `limit` matches. */
  async search(query: string, limit = 50): Promise<{ path: string; line: number; text: string }[]> {
    const out: { path: string; line: number; text: string }[] = [];
    const lower = query.toLowerCase();
    const walk = async (absDir: string, relDir: string): Promise<void> => {
      if (out.length >= limit) return;
      let entries: import('node:fs').Dirent[];
      try {
        entries = await fs.readdir(absDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (out.length >= limit) return;
        if (e.name.startsWith('.') || IGNORE.has(e.name)) continue;
        const childAbs = join(absDir, e.name);
        const childRel = this.toPosix(relDir ? join(relDir, e.name) : e.name);
        if (e.isDirectory()) {
          await walk(childAbs, childRel);
        } else {
          let content: string;
          try {
            const stat = await fs.stat(childAbs);
            if (stat.size > 1_000_000) continue; // skip large/binary
            content = await fs.readFile(childAbs, 'utf8');
          } catch {
            continue;
          }
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i]!.toLowerCase().includes(lower)) {
              out.push({ path: childRel, line: i + 1, text: lines[i]!.slice(0, 200) });
              if (out.length >= limit) return;
            }
          }
        }
      }
    };
    await walk(this.root, '');
    return out;
  }

  relativePath(absPath: string): string {
    return this.toPosix(relative(this.root, absPath));
  }
}
