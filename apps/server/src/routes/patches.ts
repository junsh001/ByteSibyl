import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { HookRegistry } from '@wac/hooks';
import { createPatchProposal } from '@wac/patch-engine';
import { evaluatePatchApply } from '@wac/permission';
import type {
  ApplyPatchResponse,
  ApprovalRequestId,
  CreatePatchPreviewRequest,
  CreatePatchPreviewResponse,
  DecidePatchApprovalResponse,
  PatchProposal,
  RequestPatchApprovalResponse,
} from '@wac/shared';
import type { SessionStore } from '@wac/telemetry';
import type { WorkspaceService } from '@wac/workspace';

const MAX_PATCH_PREVIEW_BYTES = 512 * 1024;

export async function registerPatchRoutes(
  app: FastifyInstance,
  deps: {
    workspace: WorkspaceService;
    hooks: HookRegistry;
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

    const before = await deps.hooks.beforeFileEdit({
      sessionId: body.sessionId,
      path: body.path,
    });
    if (body.sessionId) await deps.sessionStore.saveHookRecords(before.records);
    if (before.blocked) {
      return reply.code(403).send({ error: before.message, hooks: before.records }) as never;
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

  app.post(
    '/api/patches/:id/request-approval',
    async (req, reply): Promise<RequestPatchApprovalResponse> => {
      const { id } = req.params as { id: string };
      const proposal = deps.sessionStore.getPatch(id);
      if (!proposal) {
        return reply.code(404).send({ error: 'patch not found' }) as never;
      }
      if (!proposal.sessionId) {
        return reply.code(409).send({ error: 'patch is not bound to a session' }) as never;
      }

      const decision = evaluatePatchApply(proposal);
      if (decision.effect === 'deny') {
        const blocked = await deps.sessionStore.updatePatchStatus(id, 'blocked');
        return { proposal: blocked, decision };
      }

      const existing = deps.sessionStore.findPendingApprovalForSubject(id);
      if (existing) {
        return { proposal, approval: existing, decision };
      }

      const approval = await deps.sessionStore.createApprovalRequest({
        sessionId: proposal.sessionId,
        action: 'apply_patch',
        subjectId: proposal.id,
        permission: 'write_patch',
        status: 'pending',
        reason: decision.reason,
        decision,
      });
      const waiting = await deps.sessionStore.updatePatchStatus(id, 'waiting_approval');
      await deps.sessionStore.updateSessionStatus(proposal.sessionId, 'waiting_approval');
      return { proposal: waiting, approval, decision };
    },
  );

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

  app.post(
    '/api/approvals/:id/approve',
    async (req, reply): Promise<DecidePatchApprovalResponse> => {
      const { id } = req.params as { id: ApprovalRequestId };
      const approval = deps.sessionStore.getApproval(id);
      if (!approval) {
        return reply.code(404).send({ error: 'approval not found' }) as never;
      }
      const proposal = deps.sessionStore.getPatch(approval.subjectId);
      if (!proposal) {
        return reply.code(404).send({ error: 'patch not found' }) as never;
      }
      const decision = evaluatePatchApply(proposal);
      if (decision.effect !== 'approval_required') {
        return reply.code(409).send({ error: decision.reason, decision }) as never;
      }
      const updatedApproval = await deps.sessionStore.updateApprovalStatus(id, 'approved');
      const updatedProposal = await deps.sessionStore.updatePatchStatus(proposal.id, 'approved');
      return { proposal: updatedProposal, approval: updatedApproval };
    },
  );

  app.post(
    '/api/approvals/:id/reject',
    async (req, reply): Promise<DecidePatchApprovalResponse> => {
      const { id } = req.params as { id: ApprovalRequestId };
      const approval = deps.sessionStore.getApproval(id);
      if (!approval) {
        return reply.code(404).send({ error: 'approval not found' }) as never;
      }
      const proposal = deps.sessionStore.getPatch(approval.subjectId);
      if (!proposal) {
        return reply.code(404).send({ error: 'patch not found' }) as never;
      }
      const updatedApproval = await deps.sessionStore.updateApprovalStatus(id, 'rejected');
      const updatedProposal = await deps.sessionStore.updatePatchStatus(proposal.id, 'rejected');
      if (proposal.sessionId) {
        await deps.sessionStore.updateSessionStatus(proposal.sessionId, 'completed');
      }
      return { proposal: updatedProposal, approval: updatedApproval };
    },
  );

  app.post('/api/patches/:id/apply', async (req, reply): Promise<ApplyPatchResponse> => {
    const { id } = req.params as { id: string };
    const proposal = deps.sessionStore.getPatch(id);
    if (!proposal) {
      return reply.code(404).send({ error: 'patch not found' }) as never;
    }
    const approval = deps.sessionStore.findApprovedApprovalForSubject(proposal.id);
    if (!approval) {
      return reply.code(409).send({ error: 'patch approval is required before apply' }) as never;
    }
    if (proposal.status !== 'approved') {
      return reply.code(409).send({ error: `patch is not approved: ${proposal.status}` }) as never;
    }
    if (proposal.updatedContent === undefined) {
      return reply.code(409).send({ error: 'patch does not include updatedContent' }) as never;
    }
    const before = await deps.hooks.beforeFileEdit({
      sessionId: proposal.sessionId,
      path: proposal.path,
    });
    if (proposal.sessionId) await deps.sessionStore.saveHookRecords(before.records);
    if (before.blocked) {
      return reply.code(403).send({ error: before.message, hooks: before.records }) as never;
    }
    const decision = evaluatePatchApply(proposal);
    if (decision.effect !== 'approval_required') {
      return reply.code(409).send({ error: decision.reason, decision }) as never;
    }

    await deps.workspace.writeTextFile(proposal.path, proposal.updatedContent);
    const after = await deps.hooks.afterFileEdit({
      sessionId: proposal.sessionId,
      path: proposal.path,
    });
    if (proposal.sessionId) await deps.sessionStore.saveHookRecords(after.records);
    const applied = await deps.sessionStore.updatePatchStatus(proposal.id, 'applied');
    if (proposal.sessionId) {
      await deps.sessionStore.updateSessionStatus(proposal.sessionId, 'completed');
    }
    return { proposal: applied, content: proposal.updatedContent };
  });
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}
