import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { createModelProvider } from '@wac/model-provider';
import { ShellRunner } from '@wac/shell-runner';
import { SessionStore } from '@wac/telemetry';
import { WorkspaceService } from '@wac/workspace';
import { ToolRunner, createWorkspaceToolRegistry } from '@wac/tool-system';
import {
  sseFrame,
  type AgentShellEvent,
  type CreateAgentSessionRequest,
  type CreateAgentSessionResponse,
  type HealthResponse,
  type ModelProviderStatusResponse,
  type SessionId,
} from '@wac/shared';
import { config } from './config.js';
import { registerAgentRoutes } from './routes/agent.js';
import { registerPatchRoutes } from './routes/patches.js';
import { registerSelfRepairRoutes } from './routes/self-repair.js';
import { registerShellRoutes } from './routes/shell.js';
import { registerToolRoutes } from './routes/tools.js';
import { registerWorkspaceRoutes } from './routes/workspace.js';

const sessionStore = new SessionStore(config.sessionLogPath);
await sessionStore.load();
const workspace = new WorkspaceService(config.workspaceRoot);
const shellRunner = new ShellRunner({ workspaceRoot: config.workspaceRoot });
const toolRegistry = createWorkspaceToolRegistry();
const toolRunner = new ToolRunner(toolRegistry, { workspace, trace: [] });
const model = createModelProvider({
  provider: config.modelProvider,
  apiKey: config.modelApiKey,
  baseUrl: config.modelBaseUrl,
  model: config.modelName,
  timeoutMs: config.modelTimeoutMs,
});

const app = Fastify({ logger: { level: 'info' }, bodyLimit: 10 * 1024 * 1024 });
await app.register(cors, { origin: true });
await registerWorkspaceRoutes(app, workspace);
await registerToolRoutes(app, toolRegistry, toolRunner);
await registerAgentRoutes(app, { model, toolRegistry, toolRunner, sessionStore });
await registerPatchRoutes(app, { workspace, sessionStore });
await registerShellRoutes(app, { shellRunner, sessionStore });
await registerSelfRepairRoutes(app, { shellRunner, workspace, sessionStore });

app.get('/api/health', async (): Promise<HealthResponse> => ({
  ok: true,
  service: 'web-ai-coding-agent-lab',
  phase: 'phase-10-model-provider-integration',
  timestamp: new Date().toISOString(),
}));

app.get('/api/model-provider/status', async (): Promise<ModelProviderStatusResponse> => ({
  provider: model.info,
}));

app.post('/api/sessions', async (req): Promise<CreateAgentSessionResponse> => {
  const body = (req.body ?? {}) as CreateAgentSessionRequest;
  const session = await sessionStore.createSession(body.title);
  return { session };
});

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
  try {
    return sessionStore.getSessionLog(id);
  } catch {
    return reply.code(404).send({ error: 'session not found' });
  }
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
