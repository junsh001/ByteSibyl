import type { FastifyInstance } from 'fastify';
import { WorkspacePathError, WorkspaceService } from '@wac/workspace';
import type {
  CreateWorkspaceEntryRequest,
  DeleteWorkspaceEntryRequest,
  ReadWorkspaceFileResponse,
  RenameWorkspaceEntryRequest,
  SearchTextResponse,
  WorkspaceMutationResponse,
  WorkspaceFileNode,
  WorkspaceInfo,
  WriteWorkspaceFileRequest,
  WriteWorkspaceFileResponse,
} from '@wac/shared';

export async function registerWorkspaceRoutes(
  app: FastifyInstance,
  workspace: WorkspaceService,
): Promise<void> {
  app.get('/api/workspace', async (): Promise<WorkspaceInfo> => ({
    rootName: workspace.root.split('/').at(-1) || workspace.root,
    rootPath: workspace.root,
  }));

  app.get('/api/workspace/tree', async (): Promise<WorkspaceFileNode> => workspace.tree());

  app.get('/api/workspace/file', async (req, reply) => {
    const { path } = req.query as { path?: string };
    if (!path) {
      return reply.code(400).send({ error: 'path is required' });
    }

    try {
      const content = await workspace.readTextFile(path);
      const response: ReadWorkspaceFileResponse = { path, content };
      return response;
    } catch (err) {
      const status = err instanceof WorkspacePathError ? 403 : 404;
      return reply.code(status).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/api/workspace/file', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<WriteWorkspaceFileRequest>;
    if (!body.path || body.content === undefined) {
      return reply.code(400).send({ error: 'path and content are required' });
    }

    try {
      await workspace.writeTextFile(body.path, body.content);
      const response: WriteWorkspaceFileResponse = { path: body.path, content: body.content };
      return response;
    } catch (err) {
      const status = err instanceof WorkspacePathError ? 403 : 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post('/api/workspace/entry', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<CreateWorkspaceEntryRequest>;
    if (!body.path || !body.kind) {
      return reply.code(400).send({ error: 'path and kind are required' });
    }

    try {
      if (body.kind === 'dir') {
        await workspace.createDirectory(body.path);
      } else {
        await workspace.createTextFile(body.path, body.content ?? '');
      }
      const response: WorkspaceMutationResponse = { tree: await workspace.tree() };
      return response;
    } catch (err) {
      const status = err instanceof WorkspacePathError ? 403 : 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.patch('/api/workspace/entry', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<RenameWorkspaceEntryRequest>;
    if (!body.fromPath || !body.toPath) {
      return reply.code(400).send({ error: 'fromPath and toPath are required' });
    }

    try {
      await workspace.renameEntry(body.fromPath, body.toPath);
      const response: WorkspaceMutationResponse = { tree: await workspace.tree() };
      return response;
    } catch (err) {
      const status = err instanceof WorkspacePathError ? 403 : 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.delete('/api/workspace/entry', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<DeleteWorkspaceEntryRequest>;
    if (!body.path) {
      return reply.code(400).send({ error: 'path is required' });
    }

    try {
      await workspace.deleteEntry(body.path);
      const response: WorkspaceMutationResponse = { tree: await workspace.tree() };
      return response;
    } catch (err) {
      const status = err instanceof WorkspacePathError ? 403 : 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get('/api/workspace/search', async (req, reply) => {
    const { q } = req.query as { q?: string };
    if (!q?.trim()) {
      return reply.code(400).send({ error: 'q is required' });
    }

    try {
      const response: SearchTextResponse = {
        query: q,
        matches: await workspace.searchText(q),
      };
      return response;
    } catch (err) {
      const status = err instanceof WorkspacePathError ? 403 : 500;
      return reply.code(status).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}
