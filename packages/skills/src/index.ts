import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { SkillInfo, SkillSelection } from '@wac/shared';

export interface LoadedSkill extends SkillInfo {
  instructions: string;
}

export class SkillRegistry {
  constructor(private readonly skills: LoadedSkill[]) {}

  static async loadFromDirectory(root: string): Promise<SkillRegistry> {
    const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
    const skills: LoadedSkill[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const path = join(root, entry.name, 'SKILL.md');
      const raw = await readFile(path, 'utf8').catch(() => undefined);
      if (!raw) continue;
      skills.push(parseSkill(raw, root, path, entry.name));
    }
    return new SkillRegistry(skills.sort((left, right) => left.name.localeCompare(right.name)));
  }

  list(): SkillInfo[] {
    return this.skills.map(({ instructions: _instructions, ...skill }) => ({ ...skill }));
  }

  select(task: string): SkillSelection | null {
    const normalizedTask = task.toLowerCase();
    const ranked = this.skills
      .map((skill) => ({
        skill,
        score: scoreSkill(skill, normalizedTask),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.skill.name.localeCompare(right.skill.name));
    const best = ranked[0];
    if (!best) return null;
    return {
      skill: toInfo(best.skill),
      reason: `matched ${best.score} trigger points for task`,
      instructions: best.skill.instructions,
    };
  }
}

function parseSkill(raw: string, root: string, absolutePath: string, fallbackName: string): LoadedSkill {
  const { manifest, body } = splitFrontmatter(raw);
  const name = manifest.name ?? fallbackName;
  const description = manifest.description ?? firstHeading(body) ?? name;
  const triggers = parseTriggers(manifest.triggers ?? manifest.keywords ?? '');
  return {
    name,
    description,
    path: normalizePath(relative(root, absolutePath)),
    triggers,
    instructions: body.trim(),
  };
}

function splitFrontmatter(raw: string): {
  manifest: Record<string, string>;
  body: string;
} {
  if (!raw.startsWith('---')) return { manifest: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { manifest: {}, body: raw };
  const block = raw.slice(3, end).trim();
  const body = raw.slice(end + 4);
  const manifest: Record<string, string> = {};
  for (const line of block.split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/u);
    if (!match?.[1]) continue;
    manifest[match[1]] = match[2]?.trim() ?? '';
  }
  return { manifest, body };
}

function parseTriggers(raw: string): string[] {
  return raw
    .split(/[,，]/u)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function firstHeading(body: string): string | undefined {
  return body
    .split(/\r?\n/u)
    .find((line) => line.startsWith('# '))
    ?.replace(/^#\s+/u, '')
    .trim();
}

function scoreSkill(skill: LoadedSkill, normalizedTask: string): number {
  let score = 0;
  const haystack = `${skill.name} ${skill.description} ${skill.triggers.join(' ')}`.toLowerCase();
  for (const trigger of skill.triggers) {
    if (normalizedTask.includes(trigger)) score += 10;
  }
  for (const token of normalizedTask.match(/[a-z_$][\w$-]{2,}|[\u4e00-\u9fa5]{2,}/gu) ?? []) {
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

function toInfo(skill: LoadedSkill): SkillInfo {
  return {
    name: skill.name,
    description: skill.description,
    path: skill.path,
    triggers: [...skill.triggers],
  };
}

function normalizePath(path: string): string {
  return path.split(sep).join('/');
}
