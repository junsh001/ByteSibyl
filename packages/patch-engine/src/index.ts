import type { PatchHunk, PatchLine, PatchProposal } from '@wac/shared';

export interface CreatePatchProposalInput {
  id: string;
  sessionId?: string;
  path: string;
  originalContent: string;
  updatedContent: string;
  now?: string;
}

type DiffOp =
  | { type: 'context'; content: string; oldLine: number; newLine: number }
  | { type: 'remove'; content: string; oldLine: number }
  | { type: 'add'; content: string; newLine: number };

export function createPatchProposal(input: CreatePatchProposalInput): PatchProposal {
  const oldLines = splitLines(input.originalContent);
  const newLines = splitLines(input.updatedContent);
  const ops = diffLines(oldLines, newLines);
  const patchLines = ops.map(toPatchLine);
  const hunks = patchLines.length === 0 ? [] : [createSingleHunk(patchLines, oldLines, newLines)];
  const additions = patchLines.filter((line) => line.type === 'add').length;
  const deletions = patchLines.filter((line) => line.type === 'remove').length;
  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id,
    sessionId: input.sessionId,
    path: normalizePath(input.path),
    status: 'proposed',
    additions,
    deletions,
    oldLineCount: oldLines.length,
    newLineCount: newLines.length,
    hunks,
    unifiedDiff: formatUnifiedDiff(input.path, hunks),
    updatedContent: input.updatedContent,
    createdAt: now,
    updatedAt: now,
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
  const normalizedPath = normalizePath(path);
  const output = [`--- a/${normalizedPath}`, `+++ b/${normalizedPath}`];

  for (const hunk of hunks) {
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
