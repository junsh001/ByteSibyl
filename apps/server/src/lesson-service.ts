import { complete, Workspace } from '@wac/agent';
import type { Db } from '@wac/db';
import type { Lesson, LessonProgress, LessonTask } from '@wac/shared';
import type { AppConfig } from './config.js';
import { LESSONS, LESSON_BY_ID } from './lessons.js';

export interface GradeResult {
  passed: boolean;
  feedback: string;
  lessonCompleted?: boolean;
  unlockedLessonId?: string;
  xp?: number;
}

export class LessonService {
  constructor(
    private cfg: AppConfig,
    private db: Db,
  ) {
    this.seed();
  }

  /** Make sure the first lesson is available on a fresh install. */
  private seed() {
    const existing = new Map(this.db.getProgress().map((p) => [p.lessonId, p]));
    for (const lesson of LESSONS) {
      if (!existing.has(lesson.id)) {
        this.db.setProgress({
          lessonId: lesson.id,
          status: lesson.order === 1 ? 'available' : 'locked',
          completedTaskIds: [],
        });
      }
    }
  }

  listWithProgress(): { lessons: Lesson[]; progress: LessonProgress[]; xp: number } {
    return {
      lessons: LESSONS,
      progress: this.db.getProgress(),
      xp: this.db.getXp(),
    };
  }

  private progressFor(lessonId: string): LessonProgress {
    return (
      this.db.getProgress().find((p) => p.lessonId === lessonId) ?? {
        lessonId,
        status: 'locked',
        completedTaskIds: [],
      }
    );
  }

  async grade(lessonId: string, taskId: string, ws: Workspace): Promise<GradeResult> {
    const lesson = LESSON_BY_ID.get(lessonId);
    if (!lesson) return { passed: false, feedback: `Unknown lesson: ${lessonId}` };
    const task = lesson.tasks.find((t) => t.id === taskId);
    if (!task) return { passed: false, feedback: `Unknown task: ${taskId}` };

    const check = await this.runCheck(task, ws);
    if (!check.passed) return check;

    // Record completion of this task.
    const prog = this.progressFor(lessonId);
    const completedTaskIds = Array.from(new Set([...prog.completedTaskIds, taskId]));
    const allDone = lesson.tasks.every((t) => completedTaskIds.includes(t.id));

    this.db.setProgress({
      lessonId,
      status: allDone ? 'completed' : prog.status === 'locked' ? 'available' : prog.status,
      completedTaskIds,
    });

    const result: GradeResult = { passed: true, feedback: check.feedback };

    if (allDone) {
      result.lessonCompleted = true;
      result.xp = this.db.addXp(lesson.xp);
      const next = LESSONS.find((l) => l.order === lesson.order + 1);
      if (next) {
        const nextProg = this.progressFor(next.id);
        if (nextProg.status === 'locked') {
          this.db.setProgress({ lessonId: next.id, status: 'available', completedTaskIds: [] });
          result.unlockedLessonId = next.id;
        }
      }
    }
    return result;
  }

  private async runCheck(task: LessonTask, ws: Workspace): Promise<GradeResult> {
    if (task.check.kind === 'manual') {
      return { passed: true, feedback: '已标记完成 / Marked complete.' };
    }

    if (task.check.kind === 'contains') {
      const { target, needles } = task.check;
      if (!(await ws.exists(target))) {
        return { passed: false, feedback: `还没找到文件 \`${target}\`。/ File \`${target}\` not found yet.` };
      }
      const content = (await ws.readFile(target)).toLowerCase();
      const missing = needles.filter((n) => !content.includes(n.toLowerCase()));
      if (missing.length) {
        return {
          passed: false,
          feedback: `\`${target}\` 里还缺少：${missing.join(', ')}。/ Missing in \`${target}\`: ${missing.join(', ')}.`,
        };
      }
      return { passed: true, feedback: '通过！文件包含全部要点。/ Passed! All required elements present.' };
    }

    // kind === 'llm' : grade the relevant file(s) against a rubric.
    const rubric = task.check.rubric;
    const targetMatch = /([\w./-]+\.(md|json|js|ts|py|txt))/i.exec(task.instruction);
    let evidence = '';
    if (targetMatch) {
      const path = targetMatch[1]!;
      if (await ws.exists(path)) {
        evidence = `File \`${path}\`:\n\`\`\`\n${(await ws.readFile(path)).slice(0, 4000)}\n\`\`\``;
      } else {
        return { passed: false, feedback: `还没找到要检查的文件。/ The file to grade was not found yet.` };
      }
    } else {
      const tree = await ws.tree();
      evidence = `Project tree:\n${JSON.stringify(tree, null, 0).slice(0, 2000)}`;
    }

    const raw = await complete(this.cfg.deepseek, {
      temperature: 0,
      maxTokens: 400,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict but encouraging programming tutor grading a learner exercise. Reply ONLY with minified JSON: {"pass": boolean, "feedback": string}. Feedback is one or two short sentences, bilingual (Chinese then English), actionable if failing.',
        },
        {
          role: 'user',
          content: `RUBRIC:\n${rubric}\n\nLEARNER SUBMISSION:\n${evidence}\n\nGrade it.`,
        },
      ],
    });

    try {
      const json = JSON.parse(raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim());
      return { passed: Boolean(json.pass), feedback: String(json.feedback ?? '') };
    } catch {
      // If grading output is malformed, fail safe (do not auto-pass).
      return {
        passed: false,
        feedback: '评分服务返回异常，请重试。/ Grader returned an unexpected response, please retry.',
      };
    }
  }
}
