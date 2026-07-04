import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import ts from 'typescript';
import type { DiagnosticSeverity, WorkspaceDiagnostic } from '@wac/shared';

export interface DiagnosticsProvider {
  getDiagnostics(): Promise<WorkspaceDiagnostic[]>;
}

export interface TypeScriptDiagnosticsClientOptions {
  workspaceRoot: string;
  project?: string;
}

export class TypeScriptDiagnosticsClient implements DiagnosticsProvider {
  private readonly workspaceRoot: string;
  private readonly project: string;

  constructor(options: TypeScriptDiagnosticsClientOptions) {
    this.workspaceRoot = options.workspaceRoot;
    this.project = options.project ?? join(options.workspaceRoot, 'tsconfig.json');
  }

  async getDiagnostics(): Promise<WorkspaceDiagnostic[]> {
    const config = this.readProjectConfig();
    const program = ts.createProgram({
      rootNames: config.fileNames,
      options: config.options,
      projectReferences: config.projectReferences,
    });
    const diagnostics = [
      ...program.getOptionsDiagnostics(),
      ...program.getSyntacticDiagnostics(),
      ...program.getSemanticDiagnostics(),
    ];

    return diagnostics.map((diagnostic) => this.toWorkspaceDiagnostic(diagnostic)).sort(sortDiagnostic);
  }

  private readProjectConfig(): ts.ParsedCommandLine {
    const configPath = isAbsolute(this.project) ? this.project : join(this.workspaceRoot, this.project);
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      throw new Error(formatDiagnosticMessage(configFile.error));
    }

    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      dirname(configPath),
      undefined,
      configPath,
    );
    if (parsed.errors.length > 0) {
      throw new Error(parsed.errors.map(formatDiagnosticMessage).join('\n'));
    }
    return parsed;
  }

  private toWorkspaceDiagnostic(diagnostic: ts.Diagnostic): WorkspaceDiagnostic {
    const message = formatDiagnosticMessage(diagnostic);
    const severity = mapSeverity(diagnostic.category);
    const code = String(diagnostic.code);

    if (!diagnostic.file || diagnostic.start === undefined) {
      return {
        path: basename(this.project),
        line: 1,
        column: 1,
        message,
        severity,
        code,
        source: 'typescript',
      };
    }

    const start = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    const endPosition =
      diagnostic.length === undefined ? diagnostic.start : diagnostic.start + diagnostic.length;
    const end = diagnostic.file.getLineAndCharacterOfPosition(endPosition);

    return {
      path: normalizeWorkspacePath(relative(this.workspaceRoot, diagnostic.file.fileName)),
      line: start.line + 1,
      column: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
      message,
      severity,
      code,
      source: 'typescript',
    };
  }
}

function formatDiagnosticMessage(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
}

function mapSeverity(category: ts.DiagnosticCategory): DiagnosticSeverity {
  switch (category) {
    case ts.DiagnosticCategory.Error:
      return 'error';
    case ts.DiagnosticCategory.Warning:
      return 'warning';
    case ts.DiagnosticCategory.Suggestion:
      return 'hint';
    case ts.DiagnosticCategory.Message:
      return 'info';
  }
}

function normalizeWorkspacePath(path: string): string {
  return path.split(sep).join('/');
}

function sortDiagnostic(left: WorkspaceDiagnostic, right: WorkspaceDiagnostic): number {
  return (
    left.path.localeCompare(right.path) ||
    left.line - right.line ||
    left.column - right.column ||
    left.message.localeCompare(right.message)
  );
}
