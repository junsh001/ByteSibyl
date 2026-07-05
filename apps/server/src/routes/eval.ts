import type { FastifyInstance } from 'fastify';
import { loadEvalTasks, runEvalTasks } from '@wac/eval';
import type { EvalRunResponse, EvalTaskListResponse } from '@wac/shared';

export async function registerEvalRoutes(
  app: FastifyInstance,
  deps: {
    rootDir: string;
    tasksRoot: string;
  },
): Promise<void> {
  app.get('/api/eval/tasks', async (): Promise<EvalTaskListResponse> => {
    return { tasks: await loadEvalTasks(deps.tasksRoot) };
  });

  app.post('/api/eval/run', async (): Promise<EvalRunResponse> => {
    const tasks = await loadEvalTasks(deps.tasksRoot);
    return { report: await runEvalTasks(tasks, { rootDir: deps.rootDir }) };
  });
}
