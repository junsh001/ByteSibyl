import type { TodoItem } from '@wac/shared';

export function TodoPanel({ todos }: { todos: TodoItem[] }) {
  return (
    <div className="todo-state-list">
      {todos.length === 0 ? (
        <div className="todo-state-empty">运行 Agent Loop 后会创建任务计划。</div>
      ) : (
        todos.map((todo) => (
          <div className={`todo-state-item ${todo.status}`} key={todo.id}>
            <span>{todo.status}</span>
            <strong>{todo.title}</strong>
            {todo.detail ? <small>{todo.detail}</small> : null}
          </div>
        ))
      )}
    </div>
  );
}
