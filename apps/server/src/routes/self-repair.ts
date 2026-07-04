import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { evaluatePatchApply } from '@wac/permission';
import { planSelfRepair } from '@wac/self-repair';
import type { ShellRunner } from '@wac/shell-runner';
import type {
  ApprovalRequest,
  PermissionDecision,
  SelfRepairAttempt,
  SelfRepairStatus,
  StartSelfRepairRequest,
  StartSelfRepairResponse,
  VerifySelfRepairRequest,
  VerifySelfRepairResponse,
} from '@wac/shared';
import type { SessionStore } from '@wac/telemetry';
import type { WorkspaceService } from '@wac/workspace';

const DEFAULT_REPAIR_COMMAND = 'npm run typecheck';

export async function registerSelfRepairRoutes(
  app: FastifyInstance,
  deps: {
    shellRunner: ShellRunner;
    workspace: WorkspaceService;
    sessionStore: SessionStore;
  },
): Promise<void> {
  app.post('/api/self-repair/start', async (req, reply): Promise<StartSelfRepairResponse> => {
    const body = (req.body ?? {}) as Partial<StartSelfRepairRequest>;
    const command = body.command?.trim() || DEFAULT_REPAIR_COMMAND;
    const session = body.sessionId
      ? deps.sessionStore.getSession(body.sessionId)
      : await deps.sessionStore.createSession('Phase 9 Self-Repair Loop');
    if (!session) {
      return reply.code(404).send({ error: 'session not found' }) as never;
    }

    const commandResult = await deps.shellRunner.run({
      sessionId: session.id,
      command,
      timeoutMs: 10_000,
    });
    await deps.sessionStore.saveCommandResult(commandResult);

    if (commandResult.status === 'completed') {
      const repair = await saveRepair(deps.sessionStore, {
        sessionId: session.id,
        command,
        status: 'verified',
        commandId: commandResult.id,
        message: '验证命令已通过，不需要自修复。',
        steps: [
          {
            kind: 'run_check',
            title: '运行验证命令',
            detail: '命令返回 completed。',
            createdAt: new Date().toISOString(),
          },
        ],
      });
      await deps.sessionStore.updateSessionStatus(session.id, 'completed');
      return { session: deps.sessionStore.getSession(session.id) ?? session, repair, commandResult };
    }

    if (commandResult.status !== 'failed') {
      const repair = await saveRepair(deps.sessionStore, {
        sessionId: session.id,
        command,
        status: 'blocked',
        commandId: commandResult.id,
        message: `验证命令未进入可修复失败状态：${commandResult.status}。`,
        steps: [
          {
            kind: 'run_check',
            title: '运行验证命令',
            detail: commandResult.decision.reason,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      await deps.sessionStore.updateSessionStatus(session.id, 'failed');
      return { session: deps.sessionStore.getSession(session.id) ?? session, repair, commandResult };
    }

    const planned = await planSelfRepair({
      sessionId: session.id,
      commandResult,
      workspace: deps.workspace,
    });

    if (planned.kind === 'blocked') {
      const repair = await saveRepair(deps.sessionStore, {
        sessionId: session.id,
        command,
        status: 'blocked',
        commandId: commandResult.id,
        message: planned.message,
        steps: [
          {
            kind: 'run_check',
            title: '运行验证命令',
            detail: '命令返回 failed。',
            createdAt: new Date().toISOString(),
          },
          {
            kind: 'diagnose_failure',
            title: '分析失败输出',
            detail: planned.message,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      await deps.sessionStore.updateSessionStatus(session.id, 'failed');
      return { session: deps.sessionStore.getSession(session.id) ?? session, repair, commandResult };
    }

    await deps.sessionStore.savePatchProposal(planned.proposal);
    const decision = evaluatePatchApply(planned.proposal);
    if (decision.effect === 'deny') {
      const blocked = await deps.sessionStore.updatePatchStatus(planned.proposal.id, 'blocked');
      const repair = await saveRepair(deps.sessionStore, {
        sessionId: session.id,
        command,
        status: 'blocked',
        commandId: commandResult.id,
        patchId: blocked.id,
        message: decision.reason,
        steps: createProposalSteps(planned.message, decision, undefined),
      });
      await deps.sessionStore.updateSessionStatus(session.id, 'failed');
      return {
        session: deps.sessionStore.getSession(session.id) ?? session,
        repair,
        commandResult,
        proposal: blocked,
        decision,
      };
    }

    const approval = await deps.sessionStore.createApprovalRequest({
      sessionId: session.id,
      action: 'apply_patch',
      subjectId: planned.proposal.id,
      permission: 'write_patch',
      status: 'pending',
      reason: decision.reason,
      decision,
    });
    const waiting = await deps.sessionStore.updatePatchStatus(planned.proposal.id, 'waiting_approval');
    await deps.sessionStore.updateSessionStatus(session.id, 'waiting_approval');
    const repair = await saveRepair(deps.sessionStore, {
      sessionId: session.id,
      command,
      status: 'waiting_approval',
      commandId: commandResult.id,
      patchId: waiting.id,
      approvalId: approval.id,
      message: '已生成修复 Patch Proposal，等待人工审批后应用。',
      steps: createProposalSteps(planned.message, decision, approval),
    });

    return {
      session: deps.sessionStore.getSession(session.id) ?? session,
      repair,
      commandResult,
      proposal: waiting,
      approval,
      decision,
    };
  });

  app.post('/api/self-repair/verify', async (req, reply): Promise<VerifySelfRepairResponse> => {
    const body = (req.body ?? {}) as Partial<VerifySelfRepairRequest>;
    if (!body.sessionId?.trim()) {
      return reply.code(400).send({ error: 'sessionId is required' }) as never;
    }
    const session = deps.sessionStore.getSession(body.sessionId);
    if (!session) {
      return reply.code(404).send({ error: 'session not found' }) as never;
    }
    if (body.patchId) {
      const patch = deps.sessionStore.getPatch(body.patchId);
      if (!patch) {
        return reply.code(404).send({ error: 'patch not found' }) as never;
      }
      if (patch.status !== 'applied') {
        return reply.code(409).send({ error: `patch must be applied before verify: ${patch.status}` }) as never;
      }
    }

    const command = body.command?.trim() || DEFAULT_REPAIR_COMMAND;
    const commandResult = await deps.shellRunner.run({
      sessionId: session.id,
      command,
      timeoutMs: 10_000,
    });
    await deps.sessionStore.saveCommandResult(commandResult);
    const status: SelfRepairStatus = commandResult.status === 'completed' ? 'verified' : 'failed';
    const repair = await saveRepair(deps.sessionStore, {
      sessionId: session.id,
      command,
      status,
      commandId: commandResult.id,
      patchId: body.patchId,
      message:
        status === 'verified'
          ? '应用 Patch 后验证通过。'
          : `应用 Patch 后验证仍未通过：${commandResult.status}。`,
      steps: [
        {
          kind: 'verify',
          title: '重新运行验证命令',
          detail: commandResult.stdout || commandResult.stderr || commandResult.decision.reason,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await deps.sessionStore.updateSessionStatus(session.id, status === 'verified' ? 'completed' : 'failed');
    return { repair, commandResult };
  });
}

function createProposalSteps(
  planMessage: string,
  decision: PermissionDecision,
  approval?: ApprovalRequest,
): SelfRepairAttempt['steps'] {
  const now = new Date().toISOString();
  return [
    {
      kind: 'run_check',
      title: '运行验证命令',
      detail: '命令返回 failed。',
      createdAt: now,
    },
    {
      kind: 'diagnose_failure',
      title: '分析失败输出',
      detail: planMessage,
      createdAt: now,
    },
    {
      kind: 'create_patch',
      title: '生成 Patch Proposal',
      detail: decision.reason,
      createdAt: now,
    },
    {
      kind: 'request_approval',
      title: '创建人工审批请求',
      detail: approval ? `approval=${approval.id}` : decision.reason,
      createdAt: now,
    },
  ];
}

async function saveRepair(
  sessionStore: SessionStore,
  input: Omit<SelfRepairAttempt, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SelfRepairAttempt> {
  const now = new Date().toISOString();
  return sessionStore.saveSelfRepairAttempt({
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  });
}
