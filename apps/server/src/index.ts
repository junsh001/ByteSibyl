import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { MockModelProvider } from '@wac/model-provider';
import { WorkspaceService } from '@wac/workspace';
import { ToolRunner, createWorkspaceToolRegistry } from '@wac/tool-system';
import {
  sseFrame,
  type AgentSession,
  type AgentShellEvent,
  type CreateAgentSessionRequest,
  type CreateAgentSessionResponse,
  type HealthResponse,
  type SessionId,
} from '@wac/shared';
import { config } from './config.js';
import { registerAgentRoutes } from './routes/agent.js';
import { registerToolRoutes } from './routes/tools.js';
import { registerWorkspaceRoutes } from './routes/workspace.js';

const sessions = new Map<SessionId, AgentSession>();
const workspace = new WorkspaceService(config.workspaceRoot);
const toolRegistry = createWorkspaceToolRegistry();
const toolRunner = new ToolRunner(toolRegistry, { workspace, trace: [] });
const model = new MockModelProvider();

const app = Fastify({ logger: { level: 'info' }, bodyLimit: 10 * 1024 * 1024 });
await app.register(cors, { origin: true });
await registerWorkspaceRoutes(app, workspace);
await registerToolRoutes(app, toolRegistry, toolRunner);
await registerAgentRoutes(app, { model, toolRegistry, toolRunner });

app.get('/api/health', async (): Promise<HealthResponse> => ({
  ok: true,
  service: 'web-ai-coding-agent-lab',
  phase: 'phase-04-agent-loop',
  timestamp: new Date().toISOString(),
}));

app.post('/api/sessions', async (req): Promise<CreateAgentSessionResponse> => {
  const body = (req.body ?? {}) as CreateAgentSessionRequest;
  const now = new Date().toISOString();
  const session: AgentSession = {
    id: randomUUID(),
    title: body.title?.trim() || 'Untitled agent session',
    status: 'created',
    createdAt: now,
  };
  sessions.set(session.id, session);
  return { session };
});

app.get('/api/sessions/:id', async (req, reply) => {
  const { id } = req.params as { id: SessionId };
  const session = sessions.get(id);
  if (!session) {
    return reply.code(404).send({ error: 'session not found' });
  }
  return { session };
});

app.get('/api/sessions/:id/events', async (req, reply) => {
  const { id } = req.params as { id: SessionId };
  const session = sessions.get(id);
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
    message: 'Phase 1 event stream connected. Agent loop starts in a later phase.',
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
