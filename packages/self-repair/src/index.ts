import { randomUUID } from 'node:crypto';
import { createPatchProposal } from '@wac/patch-engine';
import type { PatchProposal, ShellCommandResult } from '@wac/shared';
import type { WorkspaceService } from '@wac/workspace';

const DEFAULT_TARGET = 'src/index.ts';

export interface SelfRepairPlannerInput {
  sessionId: string;
  commandResult: ShellCommandResult;
  workspace: WorkspaceService;
}

export type SelfRepairPlannerResult =
  | {
      kind: 'proposal';
      proposal: PatchProposal;
      message: string;
    }
  | {
      kind: 'blocked';
      message: string;
    };

export async function planSelfRepair(
  input: SelfRepairPlannerInput,
): Promise<SelfRepairPlannerResult> {
  if (input.commandResult.status === 'completed') {
    return { kind: 'blocked', message: '验证命令已经通过，不需要生成修复 Patch。' };
  }

  const path = pickTargetPath(
    input.commandResult.command,
    input.commandResult.stdout + input.commandResult.stderr,
  );
  const originalContent = await input.workspace.readTextFile(path);
  const updatedContent = repairNumericStringAssignment(originalContent);
  if (updatedContent === originalContent) {
    return {
      kind: 'blocked',
      message: 'Phase 9 只演示已知 TypeScript 数字字段字符串赋值错误，未找到可安全修复的片段。',
    };
  }

  return {
    kind: 'proposal',
    message: '检测到数字字段被字符串字面量赋值，已生成教学用 Patch Proposal。',
    proposal: createPatchProposal({
      id: randomUUID(),
      sessionId: input.sessionId,
      path,
      originalContent,
      updatedContent,
    }),
  };
}

function pickTargetPath(command: string, output: string): string {
  const explicitExample = output.match(/examples\/buggy-ts-project\/src\/index\.ts/u);
  if (explicitExample) return explicitExample[0];
  const localSource = output.match(/\bsrc\/index\.ts\b/u);
  if (localSource) {
    return command.includes('--prefix examples/buggy-ts-project')
      ? 'examples/buggy-ts-project/src/index.ts'
      : localSource[0];
  }
  return command.includes('--prefix examples/buggy-ts-project')
    ? 'examples/buggy-ts-project/src/index.ts'
    : DEFAULT_TARGET;
}

function repairNumericStringAssignment(content: string): string {
  return content.replace(/score:\s*'(\d+)'/u, 'score: $1');
}
