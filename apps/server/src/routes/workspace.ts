import type { FastifyInstance } from 'fastify';
import { WorkspacePathError, WorkspaceService } from '@wac/workspace';
import type {
  ReadWorkspaceFileResponse,
  SearchTextResponse,
  WorkspaceFileNode,
  WorkspaceInfo,
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
