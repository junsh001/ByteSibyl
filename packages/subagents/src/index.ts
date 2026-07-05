import type {
  PermissionActionKind,
  PermissionDecisionEffect,
  SubagentActionDecision,
  SubagentDefinition,
  SubagentRole,
  SubagentRunSummary,
  SubagentSummary,
} from '@wac/shared';

type SubagentAction = PermissionActionKind | 'review_diff';

export class SubagentCoordinator {
  private readonly definitions = createDefinitions();

  list(): SubagentDefinition[] {
    return this.definitions.map((definition) => ({ ...definition }));
  }

  run(task: string): SubagentRunSummary {
    return {
      task,
      summaries: this.definitions.map((definition) => this.createSummary(definition, task)),
      createdAt: new Date().toISOString(),
    };
  }

  decide(role: SubagentRole, action: SubagentAction): SubagentActionDecision {
    if (role === 'planner') {
      return decision(
        action,
        action === 'read_workspace' ? 'allow' : 'deny',
        action === 'read_workspace'
          ? 'planner is read-only and may inspect context.'
          : 'planner is read-only and cannot write files, apply patches, or run commands.',
      );
    }

    if (role === 'reviewer') {
      if (action === 'read_workspace' || action === 'review_diff') {
        return decision(action, 'allow', 'reviewer may inspect files, diffs, and validation evidence.');
      }
      return decision(action, 'deny', 'reviewer is read-only and cannot execute risky commands or write files.');
    }

    if (action === 'apply_patch') {
      return decision(action, 'approval_required', 'coder can prepare patches, but apply requires approval.');
    }
    if (action === 'read_workspace' || action === 'preview_patch') {
      return decision(action, 'allow', 'coder may inspect context and prepare patch proposals.');
    }
    return decision(action, 'deny', 'coder cannot bypass Shell Runner or approval boundaries.');
  }

  private createSummary(definition: SubagentDefinition, task: string): SubagentSummary {
    if (definition.role === 'planner') {
      return {
        role: definition.role,
        name: definition.name,
        permission: definition.permission,
        summary: `拆解任务并给 coder/reviewer 提供只读计划：${summarizeTask(task)}`,
        decisions: [
          this.decide('planner', 'read_workspace'),
          this.decide('planner', 'apply_patch'),
        ],
      };
    }

    if (definition.role === 'coder') {
      return {
        role: definition.role,
        name: definition.name,
        permission: definition.permission,
        summary: '准备 Patch Proposal；真正 apply patch 必须经过 Human-in-the-loop approval。',
        decisions: [
          this.decide('coder', 'preview_patch'),
          this.decide('coder', 'apply_patch'),
        ],
      };
    }

    return {
      role: definition.role,
      name: definition.name,
      permission: definition.permission,
      summary: '审查 Diff Preview 与验证结果；只读角色不能执行危险命令。',
      decisions: [
        this.decide('reviewer', 'review_diff'),
        this.decide('reviewer', 'execute_command'),
      ],
    };
  }
}

function createDefinitions(): SubagentDefinition[] {
  return [
    {
      role: 'planner',
      name: 'Planner Subagent',
      permission: 'read_only',
      systemPrompt:
        'You are the planner subagent. Break the task into small steps. You may only inspect context and must not write files or run commands.',
      responsibilities: ['拆解任务', '选择上下文', '输出只读计划'],
    },
    {
      role: 'coder',
      name: 'Coder Subagent',
      permission: 'write_patch_with_approval',
      systemPrompt:
        'You are the coder subagent. Prepare patch proposals only. Applying patches requires human approval and must not bypass guardrails.',
      responsibilities: ['准备 patch proposal', '说明修改意图', '等待审批后 apply'],
    },
    {
      role: 'reviewer',
      name: 'Reviewer Subagent',
      permission: 'read_only',
      systemPrompt:
        'You are the reviewer subagent. Review diffs and validation evidence. You may not write files or execute dangerous commands.',
      responsibilities: ['审查 diff', '审查验证结果', '报告风险'],
    },
  ];
}

function decision(
  action: SubagentAction,
  effect: PermissionDecisionEffect,
  reason: string,
): SubagentActionDecision {
  return { action, effect, reason };
}

function summarizeTask(task: string): string {
  return task.replace(/\s+/gu, ' ').trim().slice(0, 120) || '未提供任务';
}
