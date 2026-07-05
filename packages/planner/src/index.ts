import { randomUUID } from 'node:crypto';
import type { TodoItem, TodoStatus } from '@wac/shared';

export class TodoPlanner {
  private todos: TodoItem[] = [];

  createInitialPlan(task: string): TodoItem[] {
    return this.writeTodos([
      `理解任务：${summarize(task)}`,
      '构建上下文并选择相关文件',
      '调用模型决定下一步工具动作',
      '执行工具并读取 observation',
      '完成总结或标记 blocked',
    ]);
  }

  writeTodos(titles: string[]): TodoItem[] {
    const now = new Date().toISOString();
    this.todos = titles
      .map((title) => title.trim())
      .filter(Boolean)
      .map((title, index): TodoItem => ({
        id: randomUUID(),
        title,
        status: index === 0 ? 'in_progress' : 'pending',
        createdAt: now,
        updatedAt: now,
      }));
    return this.readTodos();
  }

  readTodos(): TodoItem[] {
    return this.todos.map((todo) => ({ ...todo }));
  }

  updateTodo(id: string, status: TodoStatus, detail?: string): TodoItem[] {
    const now = new Date().toISOString();
    this.todos = this.todos.map((todo) =>
      todo.id === id
        ? {
            ...todo,
            status,
            detail: detail?.trim() || todo.detail,
            updatedAt: now,
          }
        : todo,
    );
    return this.readTodos();
  }

  startStep(match: string, detail?: string): TodoItem[] {
    return this.transition(match, 'in_progress', detail);
  }

  completeStep(match: string, detail?: string): TodoItem[] {
    return this.transition(match, 'done', detail);
  }

  blockCurrent(reason: string): TodoItem[] {
    const active =
      this.todos.find((todo) => todo.status === 'in_progress') ??
      this.todos.find((todo) => todo.status === 'pending');
    if (!active) return this.readTodos();
    return this.updateTodo(active.id, 'blocked', reason);
  }

  completeAll(detail?: string): TodoItem[] {
    const now = new Date().toISOString();
    this.todos = this.todos.map((todo) => ({
      ...todo,
      status: todo.status === 'blocked' ? 'blocked' : 'done',
      detail: detail ?? todo.detail,
      updatedAt: now,
    }));
    return this.readTodos();
  }

  private transition(match: string, status: TodoStatus, detail?: string): TodoItem[] {
    const now = new Date().toISOString();
    const targetIndex = this.todos.findIndex((todo) => todo.title.includes(match));
    if (targetIndex < 0) return this.readTodos();
    this.todos = this.todos.map((todo, index) => {
      if (index === targetIndex) {
        return {
          ...todo,
          status,
          detail: detail?.trim() || todo.detail,
          updatedAt: now,
        };
      }
      if (status === 'in_progress' && todo.status === 'in_progress') {
        return { ...todo, status: 'pending', updatedAt: now };
      }
      return todo;
    });
    return this.readTodos();
  }
}

function summarize(task: string): string {
  const normalized = task.trim().replace(/\s+/gu, ' ');
  if (normalized.length <= 48) return normalized || '未命名任务';
  return `${normalized.slice(0, 45)}...`;
}
