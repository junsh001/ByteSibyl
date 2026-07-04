import type {
  GuardrailViolation,
  PatchProposal,
  PermissionActionKind,
  PermissionDecision,
  ToolPermission,
} from '@wac/shared';

export interface PatchGuardrailOptions {
  maxChangedLines?: number;
}

const DEFAULT_MAX_CHANGED_LINES = 240;
const FORBIDDEN_PATH_PATTERNS = [
  /^\.env(?:\.|$)/,
  /^\.git\//,
  /^node_modules\//,
  /(^|\/)package-lock\.json$/,
];

export function evaluatePermission(
  action: PermissionActionKind,
  permission: ToolPermission,
  violations: GuardrailViolation[] = [],
): PermissionDecision {
  if (permission === 'forbidden') {
    return deny(action, permission, 'Forbidden permission class.', violations);
  }
  if (permission === 'read_only') {
    return violations.length > 0
      ? deny(action, permission, 'Read action failed guardrails.', violations)
      : allow(action, permission, 'Read-only action is allowed.');
  }
  if (permission === 'write_patch') {
    return violations.length > 0
      ? deny(action, permission, 'Patch write failed guardrails.', violations)
      : approvalRequired(action, permission, 'Patch writes require human approval.');
  }
  return deny(action, permission, 'Command execution is not active before Phase 8.', violations);
}

export function evaluatePatchApply(
  proposal: PatchProposal,
  options: PatchGuardrailOptions = {},
): PermissionDecision {
  const violations: GuardrailViolation[] = [];
  const path = proposal.path.replaceAll('\\', '/');
  const changedLines = proposal.additions + proposal.deletions;
  const maxChangedLines = options.maxChangedLines ?? DEFAULT_MAX_CHANGED_LINES;

  if (proposal.status === 'discarded') {
    violations.push({
      code: 'patch_discarded',
      message: 'Discarded patch proposals cannot be approved or applied.',
    });
  }
  if (proposal.status === 'applied') {
    violations.push({
      code: 'patch_already_applied',
      message: 'This patch proposal has already been applied.',
    });
  }
  if (changedLines === 0) {
    violations.push({
      code: 'empty_patch',
      message: 'Patch proposal does not contain any file changes.',
    });
  }
  if (changedLines > maxChangedLines) {
    violations.push({
      code: 'patch_too_large',
      message: `Patch changes ${changedLines} lines, above the Phase 7 limit of ${maxChangedLines}.`,
    });
  }
  if (FORBIDDEN_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
    violations.push({
      code: 'forbidden_path',
      message: `Patch path is blocked by guardrails: ${path}`,
    });
  }

  return evaluatePermission('apply_patch', 'write_patch', violations);
}

function allow(
  action: PermissionActionKind,
  permission: ToolPermission,
  reason: string,
): PermissionDecision {
  return { effect: 'allow', action, permission, reason, violations: [] };
}

function approvalRequired(
  action: PermissionActionKind,
  permission: ToolPermission,
  reason: string,
): PermissionDecision {
  return { effect: 'approval_required', action, permission, reason, violations: [] };
}

function deny(
  action: PermissionActionKind,
  permission: ToolPermission,
  reason: string,
  violations: GuardrailViolation[],
): PermissionDecision {
  return { effect: 'deny', action, permission, reason, violations };
}
