import type { FileAction, ToolName } from '@wac/shared';
import type { ToolSchema } from './deepseek.js';
import { Workspace } from './workspace.js';
import { makeUnifiedDiff } from './diff.js';

/** Command execution backend, injected by the server (sandbox lives there). */
export interface Runner {
  run(
    command: string,
    opts: { cwd: string; signal?: AbortSignal },
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }>;
}

export interface ToolContext {
  workspace: Workspace;
  runner: Runner;
  /** Whether the agent is allowed to mutate files / run commands. */
  allowMutations: boolean;
  signal?: AbortSignal;
}

export interface ToolOutcome {
  ok: boolean;
  /** Short human-readable summary for the UI. */
  summary: string;
  /** Full result fed back to the model as the tool message content. */
  content: string;
  /** Set when a file changed, so the server can emit a file_change event. */
  fileChange?: { path: string; action: FileAction; diff?: string };
}

export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description:
        'List the project file tree (directories and files), excluding node_modules/.git/etc. Call this first to orient yourself.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the full text content of a file in the project.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Path relative to project root.' } },
        required: ['path'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Create a new file or overwrite an existing one with the given content. Use for new files or full rewrites.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string', description: 'The complete new file content.' },
        },
        required: ['path', 'content'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description:
        'Make a targeted edit by replacing an exact unique substring. `old_str` must appear exactly once in the file. Prefer this over write_file for small changes.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_str: { type: 'string', description: 'Exact text to replace (must be unique).' },
          new_str: { type: 'string', description: 'Replacement text.' },
        },
        required: ['path', 'old_str', 'new_str'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Case-insensitive substring search across the project. Returns matching file:line snippets.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run',
      description:
        'Run a shell command in the project sandbox (e.g. `node index.js`, `npm test`, `python main.py`). Returns stdout/stderr and exit code. Network is restricted and there is a time limit.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string' } },
        required: ['command'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish',
      description:
        'Call when the task is complete. Provide a concise summary of what you did for the user.',
      parameters: {
        type: 'object',
        properties: { summary: { type: 'string' } },
        required: ['summary'],
        additionalProperties: false,
      },
    },
  },
];

function clip(s: string, max = 12000): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n…[truncated ${s.length - max} chars]`;
}

export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const { workspace: ws } = ctx;
  try {
    switch (name) {
      case 'list_dir': {
        const tree = await ws.tree();
        const flat: string[] = [];
        const walk = (n: typeof tree, depth: number) => {
          for (const c of n.children ?? []) {
            flat.push('  '.repeat(depth) + (c.type === 'dir' ? c.name + '/' : c.name));
            if (c.children) walk(c, depth + 1);
          }
        };
        walk(tree, 0);
        const text = flat.join('\n') || '(empty project)';
        return { ok: true, summary: `Listed ${flat.length} entries`, content: clip(text) };
      }
      case 'read_file': {
        const path = String(args.path ?? '');
        const content = await ws.readFile(path);
        return { ok: true, summary: `Read ${path}`, content: clip(content) };
      }
      case 'write_file': {
        if (!ctx.allowMutations) return denied();
        const path = String(args.path ?? '');
        const content = String(args.content ?? '');
        const prev = (await ws.exists(path)) ? await ws.readFile(path) : '';
        const action = await ws.writeFile(path, content);
        return {
          ok: true,
          summary: `${action === 'create' ? 'Created' : 'Updated'} ${path}`,
          content: `OK: ${action} ${path} (${content.length} bytes).`,
          fileChange: { path, action, diff: makeUnifiedDiff(path, prev, content) },
        };
      }
      case 'edit_file': {
        if (!ctx.allowMutations) return denied();
        const path = String(args.path ?? '');
        const oldStr = String(args.old_str ?? '');
        const newStr = String(args.new_str ?? '');
        const prev = await ws.readFile(path);
        const count = prev.split(oldStr).length - 1;
        if (oldStr === '' || count === 0) {
          return { ok: false, summary: `No match in ${path}`, content: `Error: old_str not found in ${path}.` };
        }
        if (count > 1) {
          return {
            ok: false,
            summary: `Ambiguous edit in ${path}`,
            content: `Error: old_str appears ${count} times in ${path}; make it unique.`,
          };
        }
        const next = prev.replace(oldStr, newStr);
        await ws.writeFile(path, next);
        return {
          ok: true,
          summary: `Edited ${path}`,
          content: `OK: edited ${path}.`,
          fileChange: { path, action: 'update', diff: makeUnifiedDiff(path, prev, next) },
        };
      }
      case 'search': {
        const query = String(args.query ?? '');
        const hits = await ws.search(query);
        const text = hits.length
          ? hits.map((h) => `${h.path}:${h.line}: ${h.text}`).join('\n')
          : '(no matches)';
        return { ok: true, summary: `Search "${query}" → ${hits.length} hits`, content: clip(text) };
      }
      case 'run': {
        if (!ctx.allowMutations) return denied();
        const command = String(args.command ?? '');
        const r = await ctx.runner.run(command, { cwd: ws.root, signal: ctx.signal });
        const body = [
          `$ ${command}`,
          r.timedOut ? '[timed out]' : '',
          r.stdout && `--- stdout ---\n${r.stdout}`,
          r.stderr && `--- stderr ---\n${r.stderr}`,
          `[exit code: ${r.exitCode ?? 'null'}]`,
        ]
          .filter(Boolean)
          .join('\n');
        return {
          ok: r.exitCode === 0 && !r.timedOut,
          summary: `Ran \`${command.slice(0, 40)}\` → exit ${r.exitCode ?? '?'}`,
          content: clip(body),
        };
      }
      case 'finish': {
        const summary = String(args.summary ?? 'Done.');
        return { ok: true, summary: 'Finished', content: summary };
      }
      default:
        return { ok: false, summary: `Unknown tool ${name}`, content: `Error: unknown tool ${name}.` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, summary: `Error in ${name}`, content: `Error: ${message}` };
  }
}

function denied(): ToolOutcome {
  return {
    ok: false,
    summary: 'Blocked (ask mode)',
    content: 'Error: file mutations and command execution are disabled in ask mode.',
  };
}
