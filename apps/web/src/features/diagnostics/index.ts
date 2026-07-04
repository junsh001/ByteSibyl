import type { WorkspaceDiagnostic } from '@wac/shared';

export function countDiagnostics(
  diagnostics: WorkspaceDiagnostic[],
  severity: WorkspaceDiagnostic['severity'],
): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity).length;
}

export function formatDiagnosticTimestamp(value: string): string {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
