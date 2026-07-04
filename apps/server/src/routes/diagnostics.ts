import type { FastifyInstance } from 'fastify';
import type { DiagnosticsProvider } from '@wac/lsp-client';
import type { DiagnosticsResponse } from '@wac/shared';

export async function registerDiagnosticsRoutes(
  app: FastifyInstance,
  diagnostics: DiagnosticsProvider,
  workspaceRoot: string,
): Promise<void> {
  app.get('/api/diagnostics', async (): Promise<DiagnosticsResponse> => ({
    diagnostics: await diagnostics.getDiagnostics(),
    generatedAt: new Date().toISOString(),
    workspaceRoot,
  }));
}
