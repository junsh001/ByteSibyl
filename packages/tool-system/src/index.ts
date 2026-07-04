import type {
  JsonSchema,
  ToolCallTrace,
  ToolDefinition,
  ToolPermission,
  ToolResult,
} from '@wac/shared';
import type { WorkspaceService } from '@wac/workspace';

export interface ToolContext {
  workspace: WorkspaceService;
  trace?: ToolCallTrace[];
}

export interface Tool<I = unknown, O = unknown> {
  name: string;
  description: string;
  schema: JsonSchema;
  permission: ToolPermission;
  run(input: I, context: ToolContext): Promise<O>;
}

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      permission: tool.permission,
    }));
  }
}

export class ToolRunner {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly context: ToolContext,
  ) {}

  async run(name: string, input: unknown): Promise<ToolResult> {
    const tool = this.registry.get(name);
    const startedAt = new Date().toISOString();

    if (!tool) {
      return {
        ok: false,
        name,
        permission: 'read_only',
        error: `Unknown tool: ${name}`,
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    }

    const validation = validateInput(tool.schema, input);
    if (!validation.ok) {
      return {
        ok: false,
        name: tool.name,
        permission: tool.permission,
        error: validation.error,
        startedAt,
        finishedAt: new Date().toISOString(),
      };
    }

    try {
      const output = await tool.run(input, this.context);
      const result: ToolResult = {
        ok: true,
        name: tool.name,
        permission: tool.permission,
        output,
        startedAt,
        finishedAt: new Date().toISOString(),
      };
      this.context.trace?.push({
        name: tool.name,
        permission: tool.permission,
        input,
        ok: true,
        startedAt,
        finishedAt: result.finishedAt,
      });
      return result;
    } catch (err) {
      const result: ToolResult = {
        ok: false,
        name: tool.name,
        permission: tool.permission,
        error: err instanceof Error ? err.message : String(err),
        startedAt,
        finishedAt: new Date().toISOString(),
      };
      this.context.trace?.push({
        name: tool.name,
        permission: tool.permission,
        input,
        ok: false,
        error: result.error,
        startedAt,
        finishedAt: result.finishedAt,
      });
      return result;
    }
  }
}

export function createWorkspaceToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  registry.register({
    name: 'get_workspace_tree',
    description: 'Return the current workspace file tree.',
    permission: 'read_only',
    schema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    run: async (_input: unknown, context) => context.workspace.tree(),
  });

  registry.register({
    name: 'read_file',
    description: 'Read a UTF-8 text file inside the workspace.',
    permission: 'read_only',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', minLength: 1 },
      },
      required: ['path'],
      additionalProperties: false,
    },
    run: async (input: unknown, context) => {
      const { path } = input as { path: string };
      return {
        path,
        content: await context.workspace.readTextFile(path),
      };
    },
  });

  registry.register({
    name: 'search_text',
    description: 'Search text in workspace files and return path, line, column, and snippet.',
    permission: 'read_only',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1 },
      },
      required: ['query'],
      additionalProperties: false,
    },
    run: async (input: unknown, context) => {
      const { query } = input as { query: string };
      return {
        query,
        matches: await context.workspace.searchText(query),
      };
    },
  });

  return registry;
}

interface ValidationResult {
  ok: boolean;
  error?: string;
}

function validateInput(schema: JsonSchema, input: unknown): ValidationResult {
  if (schema.type !== 'object') {
    return { ok: false, error: 'Only object schemas are supported in Phase 3.' };
  }
  if (!isRecord(input)) {
    return { ok: false, error: 'Tool input must be an object.' };
  }

  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);

  for (const key of required) {
    if (!(key in input)) {
      return { ok: false, error: `Missing required field: ${key}` };
    }
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(input)) {
      if (!(key in properties)) {
        return { ok: false, error: `Unknown field: ${key}` };
      }
    }
  }

  for (const [key, value] of Object.entries(input)) {
    const property = properties[key];
    if (!property) continue;
    if (property.type === 'string') {
      if (typeof value !== 'string') {
        return { ok: false, error: `Field ${key} must be a string.` };
      }
      if (property.minLength !== undefined && value.length < property.minLength) {
        return { ok: false, error: `Field ${key} must not be empty.` };
      }
    }
  }

  return { ok: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
