import { TypeScriptDiagnosticsClient } from '@wac/lsp-client';

export function createDiagnosticsProvider(workspaceRoot: string): TypeScriptDiagnosticsClient {
  return new TypeScriptDiagnosticsClient({ workspaceRoot });
}
