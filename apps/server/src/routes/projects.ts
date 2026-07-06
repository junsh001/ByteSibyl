import type { FastifyInstance } from 'fastify';
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  CreateTaskWorkspaceRequest,
  ProjectListResponse,
  TaskWorkspaceListResponse,
  TaskWorkspaceResponse,
} from '@wac/shared';
import type { ProjectWorkspaceStore } from '@wac/workspace';

export async function registerProjectRoutes(
  app: FastifyInstance,
  deps: {
    projectStore: ProjectWorkspaceStore;
    activateWorkspace: (workspaceId: string) => Promise<void>;
  },
): Promise<void> {
  app.get('/api/projects', async (): Promise<ProjectListResponse> => ({
    projects: deps.projectStore.listProjects(),
    activeProjectId: deps.projectStore.getActiveProjectId(),
    activeWorkspaceId: deps.projectStore.getActiveWorkspaceId(),
  }));

  app.post('/api/projects', async (req, reply): Promise<CreateProjectResponse> => {
    const body = (req.body ?? {}) as Partial<CreateProjectRequest>;
    if (!body.repoPath?.trim()) {
      return reply.code(400).send({ error: 'repoPath is required' }) as never;
    }
    try {
      const project = await deps.projectStore.createProject({
        name: body.name,
        repoPath: body.repoPath,
      });
      return { project };
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : String(err) }) as never;
    }
  });

  app.get(
    '/api/projects/:projectId/workspaces',
    async (req, reply): Promise<TaskWorkspaceListResponse> => {
      const { projectId } = req.params as { projectId: string };
      if (!deps.projectStore.getProject(projectId)) {
        return reply.code(404).send({ error: 'project not found' }) as never;
      }
      return {
        workspaces: deps.projectStore.listWorkspaces(projectId),
        activeWorkspaceId: deps.projectStore.getActiveWorkspaceId(),
      };
    },
  );

  app.post(
    '/api/projects/:projectId/workspaces',
    async (req, reply): Promise<TaskWorkspaceResponse> => {
      const { projectId } = req.params as { projectId: string };
      const project = deps.projectStore.getProject(projectId);
      if (!project) {
        return reply.code(404).send({ error: 'project not found' }) as never;
      }
      const body = (req.body ?? {}) as Partial<CreateTaskWorkspaceRequest>;
      try {
        const workspace = await deps.projectStore.createTaskWorkspace(projectId, {
          branchName: body.branchName,
          baseRef: body.baseRef,
        });
        await deps.activateWorkspace(workspace.id);
        return { project, workspace };
      } catch (err) {
        return reply.code(400).send({ error: err instanceof Error ? err.message : String(err) }) as never;
      }
    },
  );

  app.get(
    '/api/projects/:projectId/workspaces/:workspaceId',
    async (req, reply): Promise<TaskWorkspaceResponse> => {
      const { projectId, workspaceId } = req.params as { projectId: string; workspaceId: string };
      const project = deps.projectStore.getProject(projectId);
      if (!project) {
        return reply.code(404).send({ error: 'project not found' }) as never;
      }
      const workspace = deps.projectStore.getWorkspace(workspaceId);
      if (!workspace || workspace.projectId !== projectId) {
        return reply.code(404).send({ error: 'workspace not found' }) as never;
      }
      const refreshed = await deps.projectStore.refreshWorkspace(workspaceId);
      return { project, workspace: refreshed };
    },
  );
}
