import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEvalTasks, runEvalTasks } from '@wac/eval';

interface CliOptions {
  tasksDir: string;
  reportPath?: string;
}

const rootDir = resolve(import.meta.dirname, '../..');

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const tasks = await loadEvalTasks(resolve(rootDir, options.tasksDir));
  const report = await runEvalTasks(tasks, { rootDir });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.reportPath) {
    await writeFile(resolve(rootDir, options.reportPath), json, 'utf8');
  }
  process.stdout.write(json);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { tasksDir: 'examples/eval-tasks' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--tasks-dir') {
      options.tasksDir = readArgValue(args, index);
      index += 1;
      continue;
    }
    if (arg === '--report') {
      options.reportPath = readArgValue(args, index);
      index += 1;
      continue;
    }
    throw new Error(`Unknown eval argument: ${arg}`);
  }
  return options;
}

function readArgValue(args: string[], index: number): string {
  const value = args[index + 1];
  if (!value) throw new Error(`Missing value for ${args[index]}`);
  return value;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
