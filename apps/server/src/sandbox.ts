import { spawn } from 'node:child_process';
import type { Runner } from '@wac/agent';
import type { AppConfig } from './config.js';

/** Patterns we refuse to run outright (defense-in-depth, single-user local). */
const DENY = [
  /\brm\s+-rf\s+[~/]/, // rm -rf / or ~
  /\bsudo\b/,
  /\bshutdown\b|\breboot\b|\bpoweroff\b|\bhalt\b/,
  /\bmkfs\b|\bdd\s+if=/,
  /:\(\)\s*\{.*\};:/, // fork bomb
  /\b(curl|wget)\b[^|]*\|\s*(sh|bash)\b/, // pipe-to-shell installers
  /\bchmod\s+-R\s+777\s+\//,
];

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

/**
 * A restricted command runner. Not a true container sandbox — it spawns a
 * shell with a scrubbed environment, a wall-clock timeout, an output cap, and
 * process-group kill on timeout. The Runner interface is intentionally the
 * same one a future Docker-backed runner would implement.
 */
export function createSandboxRunner(cfg: AppConfig): Runner & {
  run: (command: string, opts: { cwd: string; signal?: AbortSignal }) => Promise<RunResult>;
} {
  const { timeoutMs, maxOutputBytes } = cfg.sandbox;

  return {
    run(command, opts) {
      return new Promise<RunResult>((resolvePromise) => {
        for (const re of DENY) {
          if (re.test(command)) {
            resolvePromise({
              stdout: '',
              stderr: `Refused: command matched a blocked pattern (${re}).`,
              exitCode: 126,
              timedOut: false,
            });
            return;
          }
        }

        // Scrub the environment: never leak the API key or host secrets into
        // user code. Provide only a minimal, safe PATH/HOME/locale.
        const env: NodeJS.ProcessEnv = {
          PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
          HOME: opts.cwd,
          LANG: 'C.UTF-8',
          TERM: 'xterm-256color',
          NODE_OPTIONS: '',
          CI: '1',
        };

        const child = spawn('/bin/bash', ['-lc', command], {
          cwd: opts.cwd,
          env,
          detached: true, // own process group so we can kill the whole tree
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let timedOut = false;
        let settled = false;

        const cap = (buf: string, chunk: Buffer): string => {
          if (buf.length >= maxOutputBytes) return buf;
          return (buf + chunk.toString('utf8')).slice(0, maxOutputBytes);
        };
        child.stdout.on('data', (c: Buffer) => (stdout = cap(stdout, c)));
        child.stderr.on('data', (c: Buffer) => (stderr = cap(stderr, c)));

        const killTree = () => {
          try {
            if (child.pid) process.kill(-child.pid, 'SIGKILL');
          } catch {
            /* already dead */
          }
        };

        const timer = setTimeout(() => {
          timedOut = true;
          killTree();
        }, timeoutMs);

        const onAbort = () => killTree();
        opts.signal?.addEventListener('abort', onAbort, { once: true });

        const finish = (exitCode: number | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          opts.signal?.removeEventListener('abort', onAbort);
          resolvePromise({ stdout, stderr, exitCode, timedOut });
        };

        child.on('error', (err) => {
          stderr = cap(stderr, Buffer.from(`spawn error: ${err.message}`));
          finish(127);
        });
        child.on('close', (code) => finish(code));
      });
    },
  };
}
