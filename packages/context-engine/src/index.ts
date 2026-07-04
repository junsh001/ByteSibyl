import type {
  ContextRelevantFile,
  ContextSummary,
  ModelMessage,
  ToolDefinition,
  WorkspaceDiagnostic,
  WorkspaceFileNode,
} from '@wac/shared';

const DEFAULT_BUDGET_CHARS = 6_000;
const MAX_REPO_MAP_LINES = 40;
const MAX_RELEVANT_FILES = 8;
const MAX_DIAGNOSTICS = 8;
const RECENT_OBSERVATION_COUNT = 3;

export interface ContextEngineOptions {
  maxChars?: number;
  repoMapMaxLines?: number;
}

export interface ContextBuildInput {
  task: string;
  messages: ModelMessage[];
  tools: ToolDefinition[];
}

export interface ContextBuildResult {
  summary: ContextSummary;
  contextMessage: ModelMessage;
}

export interface ContextSource {
  getWorkspaceTree(): Promise<WorkspaceFileNode>;
  getDiagnostics(): Promise<WorkspaceDiagnostic[]>;
}

export class ContextEngine {
  private readonly maxChars: number;
  private readonly repoMapMaxLines: number;

  constructor(
    private readonly source: ContextSource,
    options: ContextEngineOptions = {},
  ) {
    this.maxChars = options.maxChars ?? DEFAULT_BUDGET_CHARS;
    this.repoMapMaxLines = options.repoMapMaxLines ?? MAX_REPO_MAP_LINES;
  }

  async build(input: ContextBuildInput): Promise<ContextBuildResult> {
    const [tree, diagnostics] = await Promise.all([
      this.source.getWorkspaceTree(),
      this.source.getDiagnostics(),
    ]);
    const repoMap = flattenRepoMap(tree).slice(0, this.repoMapMaxLines);
    const selectedDiagnostics = prioritizeDiagnostics(diagnostics).slice(0, MAX_DIAGNOSTICS);
    const observations = summarizeObservations(input.messages);
    const relevantFiles = selectRelevantFiles({
      task: input.task,
      repoMap,
      diagnostics: selectedDiagnostics,
      observations: observations.recent,
    });

    const draft = {
      taskSummary: summarizeTask(input.task),
      repoMap,
      relevantFiles,
      diagnostics: selectedDiagnostics,
      observationSummary: observations.recent,
      compressedObservationCount: observations.compressedCount,
      generatedAt: new Date().toISOString(),
    };
    const packed = packContext(draft, input.tools, this.maxChars);

    return {
      summary: {
        ...draft,
        repoMap: packed.repoMap,
        relevantFiles: packed.relevantFiles,
        diagnostics: packed.diagnostics,
        observationSummary: packed.observationSummary,
        budget: {
          maxChars: this.maxChars,
          usedChars: packed.content.length,
          truncated: packed.truncated,
        },
      },
      contextMessage: {
        role: 'system',
        content: packed.content,
      },
    };
  }
}

function flattenRepoMap(root: WorkspaceFileNode): string[] {
  const lines: string[] = [];
  visit(root, 0, lines);
  return lines;
}

function visit(node: WorkspaceFileNode, depth: number, lines: string[]): void {
  if (node.path) {
    const prefix = '  '.repeat(depth);
    lines.push(`${prefix}${node.type === 'dir' ? 'dir' : 'file'} ${node.path}`);
  }
  for (const child of node.children ?? []) {
    visit(child, node.path ? depth + 1 : depth, lines);
  }
}

function summarizeTask(task: string): string {
  return truncate(task.trim().replace(/\s+/gu, ' '), 280);
}

function prioritizeDiagnostics(diagnostics: WorkspaceDiagnostic[]): WorkspaceDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const severityDiff = severityScore(right.severity) - severityScore(left.severity);
    return (
      severityDiff ||
      left.path.localeCompare(right.path) ||
      left.line - right.line ||
      left.column - right.column
    );
  });
}

function severityScore(severity: WorkspaceDiagnostic['severity']): number {
  switch (severity) {
    case 'error':
      return 4;
    case 'warning':
      return 3;
    case 'info':
      return 2;
    case 'hint':
      return 1;
  }
}

function summarizeObservations(messages: ModelMessage[]): {
  recent: string[];
  compressedCount: number;
} {
  const toolMessages = messages.filter((message) => message.role === 'tool');
  const recent = toolMessages.slice(-RECENT_OBSERVATION_COUNT).map((message) => {
    const prefix = message.toolName ? `${message.toolName}: ` : '';
    return `${prefix}${compressObservation(message.content)}`;
  });
  return {
    recent,
    compressedCount: Math.max(0, toolMessages.length - recent.length),
  };
}

function compressObservation(content: string): string {
  const parsed = parseJson(content);
  if (isRecord(parsed)) {
    if (typeof parsed.error === 'string') return `error=${truncate(parsed.error, 240)}`;
    if (typeof parsed.path === 'string') return `path=${parsed.path}`;
    if (Array.isArray(parsed.matches)) return `matches=${parsed.matches.length}`;
    if (Array.isArray(parsed.diagnostics)) return `diagnostics=${parsed.diagnostics.length}`;
  }
  return truncate(content.replace(/\s+/gu, ' '), 240);
}

function selectRelevantFiles(input: {
  task: string;
  repoMap: string[];
  diagnostics: WorkspaceDiagnostic[];
  observations: string[];
}): ContextRelevantFile[] {
  const scores = new Map<string, ContextRelevantFile>();

  for (const diagnostic of input.diagnostics) {
    addScore(scores, diagnostic.path, 'current diagnostic', 100);
  }

  for (const path of extractPaths(input.task)) {
    addScore(scores, path, 'mentioned in task', 80);
  }

  for (const observation of input.observations) {
    for (const path of extractPaths(observation)) {
      addScore(scores, path, 'recent observation', 60);
    }
  }

  const taskTerms = extractTerms(input.task);
  for (const line of input.repoMap) {
    const path = line.replace(/^\s*(dir|file)\s+/u, '');
    if (!path || path.endsWith('/')) continue;
    const score = taskTerms.reduce((total, term) => {
      return path.toLowerCase().includes(term) ? total + 10 : total;
    }, 0);
    if (score > 0) addScore(scores, path, 'repo map match', score);
  }

  return [...scores.values()]
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, MAX_RELEVANT_FILES);
}

function addScore(
  scores: Map<string, ContextRelevantFile>,
  path: string,
  reason: string,
  score: number,
): void {
  const normalized = path.replace(/^\.?\//u, '');
  const current = scores.get(normalized);
  if (!current) {
    scores.set(normalized, { path: normalized, reason, score });
    return;
  }
  scores.set(normalized, {
    path: normalized,
    reason: current.reason.includes(reason) ? current.reason : `${current.reason}, ${reason}`,
    score: current.score + score,
  });
}

function extractPaths(text: string): string[] {
  return [...text.matchAll(/(?:[\w.-]+\/)*[\w.-]+\.(?:tsx?|jsx?|json|md|css|html)/gu)].map(
    (match) => match[0],
  );
}

function extractTerms(text: string): string[] {
  return [...new Set((text.toLowerCase().match(/[a-z_$][\w$-]{3,}/gu) ?? []).slice(-8))];
}

function packContext(
  draft: Omit<ContextSummary, 'budget'>,
  tools: ToolDefinition[],
  maxChars: number,
): {
  content: string;
  repoMap: string[];
  relevantFiles: ContextRelevantFile[];
  diagnostics: WorkspaceDiagnostic[];
  observationSummary: string[];
  truncated: boolean;
} {
  let repoMap = draft.repoMap;
  let diagnostics = draft.diagnostics;
  let observationSummary = draft.observationSummary;
  let relevantFiles = draft.relevantFiles;
  let content = renderContext({ ...draft, repoMap, diagnostics, observationSummary, relevantFiles }, tools);
  let truncated = false;

  while (content.length > maxChars && repoMap.length > 8) {
    repoMap = repoMap.slice(0, Math.ceil(repoMap.length * 0.75));
    truncated = true;
    content = renderContext({ ...draft, repoMap, diagnostics, observationSummary, relevantFiles }, tools);
  }
  while (content.length > maxChars && observationSummary.length > 1) {
    observationSummary = observationSummary.slice(-Math.max(1, observationSummary.length - 1));
    truncated = true;
    content = renderContext({ ...draft, repoMap, diagnostics, observationSummary, relevantFiles }, tools);
  }
  while (content.length > maxChars && diagnostics.length > 2) {
    diagnostics = diagnostics.slice(0, diagnostics.length - 1);
    truncated = true;
    content = renderContext({ ...draft, repoMap, diagnostics, observationSummary, relevantFiles }, tools);
  }
  while (content.length > maxChars && relevantFiles.length > 2) {
    relevantFiles = relevantFiles.slice(0, relevantFiles.length - 1);
    truncated = true;
    content = renderContext({ ...draft, repoMap, diagnostics, observationSummary, relevantFiles }, tools);
  }
  if (content.length > maxChars) {
    content = `${content.slice(0, Math.max(0, maxChars - 32))}\n[context truncated]`;
    truncated = true;
  }

  return { content, repoMap, relevantFiles, diagnostics, observationSummary, truncated };
}

function renderContext(draft: Omit<ContextSummary, 'budget'>, tools: ToolDefinition[]): string {
  const diagnostics = draft.diagnostics.map(
    (item) => `${item.severity} ${item.path}:${item.line}:${item.column} ${item.message}`,
  );
  const files = draft.relevantFiles.map(
    (item) => `${item.path} (${item.reason}, score=${item.score})`,
  );
  return [
    'Context summary for the next model call.',
    `Task: ${draft.taskSummary}`,
    `Available tools: ${tools.map((tool) => tool.name).join(', ') || 'none'}`,
    'Relevant files:',
    ...(files.length > 0 ? files : ['none selected']),
    'Current diagnostics:',
    ...(diagnostics.length > 0 ? diagnostics : ['none']),
    `Compressed old observations: ${draft.compressedObservationCount}`,
    'Recent observations:',
    ...(draft.observationSummary.length > 0 ? draft.observationSummary : ['none']),
    'Repo map:',
    ...(draft.repoMap.length > 0 ? draft.repoMap : ['empty workspace']),
  ].join('\n');
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}
