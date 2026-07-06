import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { HookRegistry } from '@wac/hooks';
import { createMultiFilePatchProposal, createPatchProposal } from '@wac/patch-engine';
import { evaluatePatchApply } from '@wac/permission';
import type {
  ApplyPatchResponse,
  ApprovalRequestId,
  CreatePatchFileInput,
  CreatePatchPreviewRequest,
  CreatePatchPreviewResponse,
  PatchFileChange,
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
    const fileInputs = normalizePreviewFiles(body);
    if (fileInputs.length === 0) {
      return reply.code(400).send({ error: 'path is required' }) as never;
    }
    if (
      fileInputs.some(
        (file) => file.kind !== 'delete' && typeof file.updatedContent !== 'string',
      )
    ) {
      return reply.code(400).send({ error: 'updatedContent is required' }) as never;
    }
    if (
      fileInputs.reduce((total, file) => total + byteLength(file.updatedContent ?? ''), 0) >
      MAX_PATCH_PREVIEW_BYTES
    ) {
      return reply.code(413).send({ error: 'updatedContent is too large' }) as never;
    }
    if (body.sessionId && !deps.sessionStore.getSession(body.sessionId)) {
      return reply.code(404).send({ error: 'session not found' }) as never;
    }

    for (const file of fileInputs) {
      const before = await deps.hooks.beforeFileEdit({
        sessionId: body.sessionId,
        path: file.oldPath ?? file.path,
      });
      if (body.sessionId) await deps.sessionStore.saveHookRecords(before.records);
      if (before.blocked) {
        return reply.code(403).send({ error: before.message, hooks: before.records }) as never;
      }
    }

    const proposal =
      fileInputs.length === 1 && !body.files
        ? createPatchProposal({
            id: randomUUID(),
            sessionId: body.sessionId,
            path: fileInputs[0]?.path ?? '',
            originalContent: await readOriginalContent(fileInputs[0]!, deps.workspace),
            updatedContent: fileInputs[0]?.updatedContent ?? '',
          })
        : createMultiFilePatchProposal({
            id: randomUUID(),
            sessionId: body.sessionId,
            files: await Promise.all(
              fileInputs.map(async (file) => ({
                path: file.path,
                oldPath: file.oldPath,
                kind: file.kind,
                originalContent: await readOriginalContent(file, deps.workspace),
                updatedContent: file.updatedContent,
              })),
            ),
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
    if (!proposal.files?.length && proposal.updatedContent === undefined) {
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

    const conflict = await findConflict(proposal.files ?? [singleFileFromProposal(proposal)], deps.workspace);
    if (conflict) {
      return reply.code(409).send({ error: conflict }) as never;
    }

    const files = proposal.files ?? [singleFileFromProposal(proposal)];
    for (const file of files) {
      const before = await deps.hooks.beforeFileEdit({
        sessionId: proposal.sessionId,
        path: file.oldPath ?? file.path,
      });
      if (proposal.sessionId) await deps.sessionStore.saveHookRecords(before.records);
      if (before.blocked) {
        return reply.code(403).send({ error: before.message, hooks: before.records }) as never;
      }
      await applyFileChange(file, deps.workspace);
      const after = await deps.hooks.afterFileEdit({
        sessionId: proposal.sessionId,
        path: file.path,
      });
      if (proposal.sessionId) await deps.sessionStore.saveHookRecords(after.records);
    }
    const applied = await deps.sessionStore.updatePatchStatus(proposal.id, 'applied');
    if (proposal.sessionId) {
      await deps.sessionStore.updateSessionStatus(proposal.sessionId, 'completed');
    }
    const gitDiff = await deps.workspace.gitDiff();
    return {
      proposal: applied,
      content: proposal.updatedContent ?? '',
      contents: files.map((file) => ({ path: file.path, content: file.updatedContent })),
      gitDiff,
    };
  });
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function normalizePreviewFiles(body: Partial<CreatePatchPreviewRequest>): CreatePatchFileInput[] {
  if (body.files?.length) {
    return body.files.map((file) => ({
      ...file,
      kind: file.kind ?? inferKind(file),
    }));
  }
  if (!body.path?.trim()) return [];
  return [{ path: body.path, updatedContent: body.updatedContent, kind: 'modify' }];
}

function inferKind(file: CreatePatchFileInput): NonNullable<CreatePatchFileInput['kind']> {
  if (file.kind) return file.kind;
  if (file.oldPath && file.oldPath !== file.path) return 'rename';
  return 'modify';
}

async function readOriginalContent(
  file: CreatePatchFileInput,
  workspace: WorkspaceService,
): Promise<string> {
  if (file.kind === 'create') return '';
  return workspace.readTextFile(file.oldPath ?? file.path);
}

function singleFileFromProposal(proposal: PatchProposal): PatchFileChange {
  return {
    path: proposal.path,
    kind: 'modify',
    additions: proposal.additions,
    deletions: proposal.deletions,
    oldLineCount: proposal.oldLineCount,
    newLineCount: proposal.newLineCount,
    hunks: proposal.hunks,
    unifiedDiff: proposal.unifiedDiff,
    updatedContent: proposal.updatedContent,
  };
}

async function findConflict(
  files: PatchFileChange[],
  workspace: WorkspaceService,
): Promise<string | null> {
  for (const file of files) {
    if (file.kind === 'create') {
      try {
        await workspace.readTextFile(file.path);
        return `Target already exists: ${file.path}`;
      } catch {
        continue;
      }
    }
    const current = await workspace.readTextFile(file.oldPath ?? file.path);
    if (file.originalContentHash && hashContent(current) !== file.originalContentHash) {
      return `Patch conflict: ${file.oldPath ?? file.path} changed after proposal creation.`;
    }
  }
  return null;
}

async function applyFileChange(file: PatchFileChange, workspace: WorkspaceService): Promise<void> {
  if (file.kind === 'create') {
    await workspace.createTextFile(file.path, file.updatedContent ?? '');
    return;
  }
  if (file.kind === 'delete') {
    await workspace.deleteEntry(file.path);
    return;
  }
  if (file.kind === 'rename') {
    if (!file.oldPath) throw new Error(`oldPath is required for rename: ${file.path}`);
    await workspace.renameEntry(file.oldPath, file.path);
    if (file.updatedContent !== undefined) {
      await workspace.writeTextFile(file.path, file.updatedContent);
    }
    return;
  }
  if (file.updatedContent === undefined) {
    throw new Error(`updatedContent is required for modify: ${file.path}`);
  }
  await workspace.writeTextFile(file.path, file.updatedContent);
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
