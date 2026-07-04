import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { createPatchProposal } from '@wac/patch-engine';
import type {
  CreatePatchPreviewRequest,
  CreatePatchPreviewResponse,
  PatchProposal,
} from '@wac/shared';
import type { SessionStore } from '@wac/telemetry';
import type { WorkspaceService } from '@wac/workspace';

const MAX_PATCH_PREVIEW_BYTES = 512 * 1024;

export async function registerPatchRoutes(
  app: FastifyInstance,
  deps: {
    workspace: WorkspaceService;
    sessionStore: SessionStore;
  },
): Promise<void> {
  app.post('/api/patches/preview', async (req, reply): Promise<CreatePatchPreviewResponse> => {
    const body = (req.body ?? {}) as Partial<CreatePatchPreviewRequest>;
    if (!body.path?.trim()) {
      return reply.code(400).send({ error: 'path is required' }) as never;
    }
    if (typeof body.updatedContent !== 'string') {
      return reply.code(400).send({ error: 'updatedContent is required' }) as never;
    }
    if (byteLength(body.updatedContent) > MAX_PATCH_PREVIEW_BYTES) {
      return reply.code(413).send({ error: 'updatedContent is too large' }) as never;
    }
    if (body.sessionId && !deps.sessionStore.getSession(body.sessionId)) {
      return reply.code(404).send({ error: 'session not found' }) as never;
    }

    const originalContent = await deps.workspace.readTextFile(body.path);
    const proposal = createPatchProposal({
      id: randomUUID(),
      sessionId: body.sessionId,
      path: body.path,
      originalContent,
      updatedContent: body.updatedContent,
    });

    if (body.sessionId) {
      await deps.sessionStore.savePatchProposal(proposal);
    }

    return { proposal };
  });

  app.get('/api/patches/:id', async (req, reply): Promise<{ proposal: PatchProposal }> => {
    const { id } = req.params as { id: string };
    const proposal = deps.sessionStore.getPatch(id);
    if (!proposal) {
      return reply.code(404).send({ error: 'patch not found' }) as never;
    }
    return { proposal };
  });

  app.post('/api/patches/:id/discard', async (req, reply): Promise<{ proposal: PatchProposal }> => {
    const { id } = req.params as { id: string };
    if (!deps.sessionStore.getPatch(id)) {
      return reply.code(404).send({ error: 'patch not found' }) as never;
    }
    const proposal = await deps.sessionStore.updatePatchStatus(id, 'discarded');
    return { proposal };
  });
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
