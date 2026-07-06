import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { ContextEngine } from '@wac/context-engine';
import { HookRegistry } from '@wac/hooks';
import { createModelProvider } from '@wac/model-provider';
import { TodoPlanner } from '@wac/planner';
import { ShellRunner } from '@wac/shell-runner';
import { SkillRegistry } from '@wac/skills';
import { SubagentCoordinator } from '@wac/subagents';
import { SessionStore } from '@wac/telemetry';
import { ProjectWorkspaceStore, WorkspaceService } from '@wac/workspace';
import { ToolRunner, createWorkspaceToolRegistry } from '@wac/tool-system';
import {
  sseFrame,
  type AgentShellEvent,
  type CreateAgentSessionRequest,
  type CreateAgentSessionResponse,
  type HealthResponse,
  type ModelProviderStatusResponse,
  type ProductTaskListResponse,
  type SubagentListResponse,
  type SessionId,
  type SessionListResponse,
} from '@wac/shared';
import { config } from './config.js';
import { createDiagnosticsProvider } from './lsp/index.js';
import { registerAgentRoutes } from './routes/agent.js';
import { registerDiagnosticsRoutes } from './routes/diagnostics.js';
import { registerEvalRoutes } from './routes/eval.js';
import { registerPatchRoutes } from './routes/patches.js';
import { registerProjectRoutes } from './routes/projects.js';
import { registerSelfRepairRoutes } from './routes/self-repair.js';
import { registerShellRoutes } from './routes/shell.js';
import { registerSkillRoutes } from './routes/skills.js';
import { registerTodoRoutes } from './routes/todos.js';
import { registerToolRoutes } from './routes/tools.js';
import { registerWorkspaceRoutes } from './routes/workspace.js';

const sessionStore = new SessionStore(config.sessionLogPath);
await sessionStore.load();
const projectStore = new ProjectWorkspaceStore({
  filePath: config.projectStorePath,
  worktreesRoot: config.worktreesRoot,
});
await projectStore.load();
const skillRegistry = await SkillRegistry.loadFromDirectory(config.skillsRoot);
const subagents = new SubagentCoordinator();
const hooks = new HookRegistry();
const workspace = new WorkspaceService(config.workspaceRoot);
const shellRunner = new ShellRunner({ workspaceRoot: config.workspaceRoot });
const planner = new TodoPlanner();
const diagnostics = createDiagnosticsProvider(config.workspaceRoot);
const contextEngine = new ContextEngine(
  {
    getWorkspaceTree: () => workspace.tree(),
    getDiagnostics: () => diagnostics.getDiagnostics(),
  },
  { maxChars: config.contextBudgetChars },
);
const toolRegistry = createWorkspaceToolRegistry({ diagnostics: true, planner: true });
const toolRunner = new ToolRunner(toolRegistry, {
  workspace,
  diagnostics,
  planner,
  hooks,
  trace: [],
});
const model = createModelProvider({
  provider: config.modelProvider,
  apiKey: config.modelApiKey,
  baseUrl: config.modelBaseUrl,
  model: config.modelName,
  timeoutMs: config.modelTimeoutMs,
});

async function activateWorkspace(workspaceId: string): Promise<void> {
  const active = await projectStore.activateWorkspace(workspaceId);
  workspace.setRoot(active.worktreePath);
  shellRunner.setWorkspaceRoot(active.worktreePath);
  diagnostics.setWorkspaceRoot(active.worktreePath);
}

const activeWorkspace = projectStore.getActiveWorkspace();
if (activeWorkspace?.status === 'active') {
  workspace.setRoot(activeWorkspace.worktreePath);
  shellRunner.setWorkspaceRoot(activeWorkspace.worktreePath);
  diagnostics.setWorkspaceRoot(activeWorkspace.worktreePath);
}

const app = Fastify({ logger: { level: 'info' }, bodyLimit: 10 * 1024 * 1024 });
await app.register(cors, { origin: true });
await registerWorkspaceRoutes(app, workspace);
await registerProjectRoutes(app, { projectStore, activateWorkspace });
await registerToolRoutes(app, toolRegistry, toolRunner);
await registerTodoRoutes(app, planner);
await registerSkillRoutes(app, skillRegistry);
await registerDiagnosticsRoutes(app, diagnostics, () => workspace.root);
await registerAgentRoutes(app, {
  model,
  toolRegistry,
  toolRunner,
  contextEngine,
  planner,
  skillRegistry,
  subagents,
  sessionStore,
  hooks,
  activateWorkspace,
});
await registerPatchRoutes(app, { workspace, hooks, sessionStore });
await registerShellRoutes(app, { shellRunner, hooks, sessionStore });
await registerSelfRepairRoutes(app, { shellRunner, workspace, sessionStore });
await registerEvalRoutes(app, { rootDir: config.rootDir, tasksRoot: config.evalTasksRoot });

app.get('/api/health', async (): Promise<HealthResponse> => ({
  ok: true,
  service: 'web-ai-coding-agent-lab',
  phase: 'product-phase-06-multifile-patch-git-output',
  timestamp: new Date().toISOString(),
}));

app.get('/api/model-provider/status', async (): Promise<ModelProviderStatusResponse> => ({
  provider: model.info,
}));

app.get('/api/subagents', async (): Promise<SubagentListResponse> => ({
  subagents: subagents.list(),
}));

app.post('/api/sessions', async (req): Promise<CreateAgentSessionResponse> => {
  const body = (req.body ?? {}) as CreateAgentSessionRequest;
  const session = await sessionStore.createSession(body.title);
  const hookResult = await hooks.onSessionStart({
    sessionId: session.id,
    subject: session.id,
  });
  await sessionStore.saveHookRecords(hookResult.records);
  return { session };
});

app.get('/api/sessions', async (): Promise<SessionListResponse> => ({
  sessions: sessionStore.listSessions(),
}));

app.get('/api/sessions/:id', async (req, reply) => {
  const { id } = req.params as { id: SessionId };
  const session = sessionStore.getSession(id);
  if (!session) {
    return reply.code(404).send({ error: 'session not found' });
  }
  return { session };
});

app.get('/api/sessions/:id/log', async (req, reply) => {
  const { id } = req.params as { id: SessionId };
  const { limit, offset } = req.query as { limit?: string; offset?: string };
  try {
    return sessionStore.getSessionLog(id, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  } catch {
    return reply.code(404).send({ error: 'session not found' });
  }
});

app.get('/api/sessions/:id/trace', async (req, reply) => {
  const { id } = req.params as { id: SessionId };
  const { limit, offset } = req.query as { limit?: string; offset?: string };
  try {
    return sessionStore.getSessionTrace(id, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  } catch {
    return reply.code(404).send({ error: 'session not found' });
  }
});

app.get('/api/tasks', async (req): Promise<ProductTaskListResponse> => {
  const { sessionId } = req.query as { sessionId?: string };
  return { tasks: sessionStore.listTasks(sessionId) };
});

app.get('/api/sessions/:id/events', async (req, reply) => {
  const { id } = req.params as { id: SessionId };
  const session = sessionStore.getSession(id);
  if (!session) {
    return reply.code(404).send({ error: 'session not found' });
  }
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const event: AgentShellEvent = {
    type: 'session.connected',
    sessionId: session.id,
    message: 'Session event stream connected. Agent run events are persisted in the session log.',
    timestamp: new Date().toISOString(),
  };
  res.write(sseFrame(event));
  res.end();
});

if (existsSync(config.webDist)) {
  await app.register(fastifyStatic, { root: config.webDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api')) return reply.code(404).send({ error: 'not found' });
    return reply.sendFile('index.html');
  });
}

const start = async () => {
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`Web AI Coding Agent Lab server on http://localhost:${config.port}`);
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
