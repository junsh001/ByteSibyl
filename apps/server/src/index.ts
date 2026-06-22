import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { runAgent } from '@wac/agent';
import { createDb } from '@wac/db';
import { sseFrame, type AgentEvent, type AgentRunRequest } from '@wac/shared';
import { config } from './config.js';
import { createSandboxRunner } from './sandbox.js';
import { ProjectService } from './projects.js';
import { LessonService } from './lesson-service.js';

const db = createDb(config.databaseUrl);
const runner = createSandboxRunner(config);
const projects = new ProjectService(config, db);
const lessons = new LessonService(config, db);

const app = Fastify({ logger: { level: 'info' }, bodyLimit: 10 * 1024 * 1024 });
await app.register(cors, { origin: true });

// --- Meta -----------------------------------------------------------------
app.get('/api/health', async () => ({
  ok: true,
  hasKey: Boolean(config.deepseek.apiKey),
  model: config.deepseek.model,
}));

// --- Projects -------------------------------------------------------------
app.get('/api/projects', async () => projects.list());

app.post('/api/projects', async (req) => {
  const body = (req.body ?? {}) as { name?: string };
  return projects.create(body.name);
});

app.get('/api/projects/default', async () => projects.ensureDefault());

app.get('/api/projects/:id', async (req, reply) => {
  const { id } = req.params as { id: string };
  const p = projects.get(id);
  if (!p) return reply.code(404).send({ error: 'not found' });
  return p;
});

// --- Files ----------------------------------------------------------------
app.get('/api/projects/:id/files', async (req) => {
  const { id } = req.params as { id: string };
  return projects.workspaceFor(id).tree();
});

app.get('/api/projects/:id/file', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { path } = req.query as { path?: string };
  if (!path) return reply.code(400).send({ error: 'path required' });
  try {
    return { path, content: await projects.workspaceFor(id).readFile(path) };
  } catch (err) {
    return reply.code(404).send({ error: (err as Error).message });
  }
});

app.put('/api/projects/:id/file', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { path, content } = (req.body ?? {}) as { path?: string; content?: string };
  if (!path) return reply.code(400).send({ error: 'path required' });
  const action = await projects.workspaceFor(id).writeFile(path, content ?? '');
  return { ok: true, action };
});

app.delete('/api/projects/:id/file', async (req, reply) => {
  const { id } = req.params as { id: string };
  const { path } = req.query as { path?: string };
  if (!path) return reply.code(400).send({ error: 'path required' });
  await projects.workspaceFor(id).deleteFile(path);
  return { ok: true };
});

// --- Messages -------------------------------------------------------------
app.get('/api/projects/:id/messages', async (req) => {
  const { id } = req.params as { id: string };
  return db.listMessages(id);
});

// --- Run a command (terminal) --------------------------------------------
app.post('/api/projects/:id/run', async (req) => {
  const { id } = req.params as { id: string };
  const { command } = (req.body ?? {}) as { command?: string };
  const ws = projects.workspaceFor(id);
  return runner.run(command ?? '', { cwd: ws.root });
});

// --- Agent (SSE) ----------------------------------------------------------
app.post('/api/projects/:id/agent', async (req, reply) => {
  const { id } = req.params as { id: string };
  const body = (req.body ?? {}) as AgentRunRequest;
  const project = projects.get(id);
  if (!project) return reply.code(404).send({ error: 'project not found' });
  if (!config.deepseek.apiKey) {
    return reply.code(503).send({ error: 'DeepSeek API key not configured on the server.' });
  }

  const ws = projects.workspaceFor(id);
  const history = db.listMessages(id).map((m) => ({ role: m.role, content: m.content }));

  // Persist the user's message.
  db.addMessage({
    id: randomUUID(),
    projectId: id,
    role: 'user',
    content: body.message,
    createdAt: Date.now(),
  });

  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const ac = new AbortController();
  let finished = false;
  // Abort the model call only if the client disconnects *before* we finish.
  res.on('close', () => {
    if (!finished) ac.abort();
  });

  const write = (e: AgentEvent) => res.write(sseFrame(e));

  let assistantText = '';
  try {
    for await (const event of runAgent(
      config.deepseek,
      {
        message: body.message,
        history,
        reasoning: body.reasoning,
        mode: body.mode ?? 'agent',
      },
      { workspace: ws, runner, signal: ac.signal },
    )) {
      if (event.type === 'token') assistantText += event.text;
      write(event);
    }
  } catch (err) {
    write({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    write({ type: 'done', finishReason: 'error' });
  }

  if (assistantText.trim()) {
    db.addMessage({
      id: randomUUID(),
      projectId: id,
      role: 'assistant',
      content: assistantText,
      createdAt: Date.now(),
    });
  }
  finished = true;
  res.end();
});

// --- Lessons / tutorial game ----------------------------------------------
app.get('/api/lessons', async () => lessons.listWithProgress());

app.post('/api/lessons/:lessonId/check', async (req, reply) => {
  const { lessonId } = req.params as { lessonId: string };
  const { taskId, projectId } = (req.body ?? {}) as { taskId?: string; projectId?: string };
  if (!taskId || !projectId) return reply.code(400).send({ error: 'taskId and projectId required' });
  const ws = projects.workspaceFor(projectId);
  return lessons.grade(lessonId, taskId, ws);
});

// --- Static (production) --------------------------------------------------
if (existsSync(config.webDist)) {
  await app.register(fastifyStatic, { root: config.webDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api')) return reply.code(404).send({ error: 'not found' });
    return reply.sendFile('index.html');
  });
}

const start = async () => {
  await projects.ensureDefault();
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`webAiCoding server on http://localhost:${config.port}`);
  if (!config.deepseek.apiKey) app.log.warn('No DeepSeek API key — agent endpoints will 503.');
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
