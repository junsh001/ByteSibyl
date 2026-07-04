import type { FastifyInstance } from 'fastify';
import type { TodoPlanner } from '@wac/planner';
import type { TodoListResponse } from '@wac/shared';

export async function registerTodoRoutes(
  app: FastifyInstance,
  planner: TodoPlanner,
): Promise<void> {
  app.get('/api/todos', async (): Promise<TodoListResponse> => ({
    todos: planner.readTodos(),
  }));
}
