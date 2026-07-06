import { createHash } from 'node:crypto';
import type {
  PatchFileChange,
  PatchFileChangeKind,
  PatchHunk,
  PatchLine,
  PatchProposal,
} from '@wac/shared';

export interface CreatePatchProposalInput {
  id: string;
  sessionId?: string;
  path: string;
  originalContent: string;
  updatedContent: string;
  now?: string;
}

export interface CreatePatchFileChangeInput {
  path: string;
  oldPath?: string;
  kind?: PatchFileChangeKind;
  originalContent: string;
  updatedContent?: string;
}

export interface CreateMultiFilePatchProposalInput {
  id: string;
  sessionId?: string;
  files: CreatePatchFileChangeInput[];
  now?: string;
}

type DiffOp =
  | { type: 'context'; content: string; oldLine: number; newLine: number }
  | { type: 'remove'; content: string; oldLine: number }
  | { type: 'add'; content: string; newLine: number };

export function createPatchProposal(input: CreatePatchProposalInput): PatchProposal {
  const file = createPatchFileChange({
    path: input.path,
    kind: 'modify',
    originalContent: input.originalContent,
    updatedContent: input.updatedContent,
  });
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    sessionId: input.sessionId,
    path: normalizePath(input.path),
    status: 'proposed',
    additions: file.additions,
    deletions: file.deletions,
    oldLineCount: file.oldLineCount,
    newLineCount: file.newLineCount,
    hunks: file.hunks,
    unifiedDiff: file.unifiedDiff,
    updatedContent: input.updatedContent,
    files: [file],
    commitMessage: createCommitMessage([file]),
    createdAt: now,
    updatedAt: now,
  };
}

export function createMultiFilePatchProposal(
  input: CreateMultiFilePatchProposalInput,
): PatchProposal {
  const files = input.files.map(createPatchFileChange);
  const now = input.now ?? new Date().toISOString();
  const additions = files.reduce((total, file) => total + file.additions, 0);
  const deletions = files.reduce((total, file) => total + file.deletions, 0);
  const first = files[0];

  return {
    id: input.id,
    sessionId: input.sessionId,
    path: files.length === 1 ? (first?.path ?? '') : '(multiple files)',
    status: 'proposed',
    additions,
    deletions,
    oldLineCount: files.reduce((total, file) => total + file.oldLineCount, 0),
    newLineCount: files.reduce((total, file) => total + file.newLineCount, 0),
    hunks: first?.hunks ?? [],
    unifiedDiff: files.map((file) => file.unifiedDiff).join(''),
    updatedContent: files.length === 1 ? first?.updatedContent : undefined,
    files,
    commitMessage: createCommitMessage(files),
    createdAt: now,
    updatedAt: now,
  };
}

export function createPatchFileChange(input: CreatePatchFileChangeInput): PatchFileChange {
  const kind = input.kind ?? 'modify';
  const oldPath = input.oldPath ? normalizePath(input.oldPath) : undefined;
  const path = normalizePath(input.path);
  const originalContent = kind === 'create' ? '' : input.originalContent;
  const updatedContent = kind === 'delete' ? '' : (input.updatedContent ?? '');
  const oldLines = splitLines(originalContent);
  const newLines = splitLines(updatedContent);
  const ops = diffLines(oldLines, newLines);
  const patchLines = ops.map(toPatchLine);
  const hunks = patchLines.length === 0 ? [] : [createSingleHunk(patchLines, oldLines, newLines)];

  return {
    path,
    oldPath,
    kind,
    additions: patchLines.filter((line) => line.type === 'add').length,
    deletions: patchLines.filter((line) => line.type === 'remove').length,
    oldLineCount: oldLines.length,
    newLineCount: newLines.length,
    hunks,
    unifiedDiff: formatUnifiedDiffForFile({
      path,
      oldPath,
      kind,
      hunks,
    }),
    originalContent,
    updatedContent: kind === 'delete' ? undefined : updatedContent,
    originalContentHash: hashContent(originalContent),
  };
}

function diffLines(oldLines: string[], newLines: string[]): DiffOp[] {
  const table = buildLcsTable(oldLines, newLines);
  const ops: DiffOp[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      ops.push({
        type: 'context',
        content: oldLines[oldIndex] ?? '',
        oldLine: oldIndex + 1,
        newLine: newIndex + 1,
      });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    const removeScore = valueAt(table, oldIndex + 1, newIndex);
    const addScore = valueAt(table, oldIndex, newIndex + 1);
    if (removeScore >= addScore) {
      ops.push({
        type: 'remove',
        content: oldLines[oldIndex] ?? '',
        oldLine: oldIndex + 1,
      });
      oldIndex += 1;
    } else {
      ops.push({
        type: 'add',
        content: newLines[newIndex] ?? '',
        newLine: newIndex + 1,
      });
      newIndex += 1;
    }
  }

  while (oldIndex < oldLines.length) {
    ops.push({
      type: 'remove',
      content: oldLines[oldIndex] ?? '',
      oldLine: oldIndex + 1,
    });
    oldIndex += 1;
  }

  while (newIndex < newLines.length) {
    ops.push({
      type: 'add',
      content: newLines[newIndex] ?? '',
      newLine: newIndex + 1,
    });
    newIndex += 1;
  }

  return trimUnchangedEdges(ops);
}

function buildLcsTable(oldLines: string[], newLines: string[]): number[][] {
  const table = Array.from({ length: oldLines.length + 1 }, () =>
    Array.from({ length: newLines.length + 1 }, () => 0),
  );

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      if (oldLines[oldIndex] === newLines[newIndex]) {
        setValueAt(table, oldIndex, newIndex, valueAt(table, oldIndex + 1, newIndex + 1) + 1);
      } else {
        setValueAt(
          table,
          oldIndex,
          newIndex,
          Math.max(valueAt(table, oldIndex + 1, newIndex), valueAt(table, oldIndex, newIndex + 1)),
        );
      }
    }
  }

  return table;
}

function valueAt(table: number[][], row: number, column: number): number {
  return table[row]?.[column] ?? 0;
}

function setValueAt(table: number[][], row: number, column: number, value: number): void {
  const targetRow = table[row];
  if (!targetRow) throw new Error(`Missing LCS row: ${row}`);
  targetRow[column] = value;
}

function trimUnchangedEdges(ops: DiffOp[]): DiffOp[] {
  let firstChanged = ops.findIndex((op) => op.type !== 'context');
  if (firstChanged === -1) return [];

  let lastChanged = ops.length - 1;
  while (lastChanged >= 0 && ops[lastChanged]?.type === 'context') {
    lastChanged -= 1;
  }

  firstChanged = Math.max(0, firstChanged - 3);
  lastChanged = Math.min(ops.length - 1, lastChanged + 3);
  return ops.slice(firstChanged, lastChanged + 1);
}

function toPatchLine(op: DiffOp): PatchLine {
  if (op.type === 'context') {
    return {
      type: 'context',
      content: op.content,
      oldLine: op.oldLine,
      newLine: op.newLine,
    };
  }
  if (op.type === 'remove') {
    return {
      type: 'remove',
      content: op.content,
      oldLine: op.oldLine,
    };
  }
  return {
    type: 'add',
    content: op.content,
    newLine: op.newLine,
  };
}

function createSingleHunk(lines: PatchLine[], oldLines: string[], newLines: string[]): PatchHunk {
  const oldLineNumbers = lines.flatMap((line) => (line.oldLine === undefined ? [] : [line.oldLine]));
  const newLineNumbers = lines.flatMap((line) => (line.newLine === undefined ? [] : [line.newLine]));
  const oldStart = oldLineNumbers[0] ?? 1;
  const newStart = newLineNumbers[0] ?? 1;
  const oldEnd = oldLineNumbers.at(-1) ?? oldStart - 1;
  const newEnd = newLineNumbers.at(-1) ?? newStart - 1;

  return {
    oldStart,
    oldLines: Math.max(0, Math.min(oldLines.length, oldEnd) - oldStart + 1),
    newStart,
    newLines: Math.max(0, Math.min(newLines.length, newEnd) - newStart + 1),
    lines,
  };
}

function formatUnifiedDiff(path: string, hunks: PatchHunk[]): string {
  return formatUnifiedDiffForFile({ path: normalizePath(path), kind: 'modify', hunks });
}

function formatUnifiedDiffForFile(input: {
  path: string;
  oldPath?: string;
  kind: PatchFileChangeKind;
  hunks: PatchHunk[];
}): string {
  const oldPath = input.oldPath ?? input.path;
  const from = input.kind === 'create' ? '/dev/null' : `a/${oldPath}`;
  const to = input.kind === 'delete' ? '/dev/null' : `b/${input.path}`;
  const output = [`--- ${from}`, `+++ ${to}`];

  if (input.kind === 'rename') {
    output.unshift(`rename from ${oldPath}`, `rename to ${input.path}`);
  }

  for (const hunk of input.hunks) {
    output.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    for (const line of hunk.lines) {
      const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
      output.push(`${prefix}${line.content}`);
    }
  }

  return `${output.join('\n')}\n`;
}

function splitLines(content: string): string[] {
  const normalized = content.replace(/\r\n/g, '\n');
  if (normalized.length === 0) return [];
  const lines = normalized.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '');
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function createCommitMessage(files: PatchFileChange[]): string {
  if (files.length === 0) return 'chore: update workspace changes';
  const kinds = new Set(files.map((file) => file.kind));
  if (files.length === 1) {
    const file = files[0];
    return `${verbForKind(file?.kind ?? 'modify')}: ${file?.path ?? 'workspace'}`;
  }
  if (kinds.size === 1) {
    return `${verbForKind(files[0]?.kind ?? 'modify')}: update ${files.length} files`;
  }
  return `chore: update ${files.length} workspace files`;
}

function verbForKind(kind: PatchFileChangeKind): string {
  if (kind === 'create') return 'feat';
  if (kind === 'delete') return 'chore';
  if (kind === 'rename') return 'refactor';
  return 'fix';
}
